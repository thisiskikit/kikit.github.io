import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getMockProducts, getMockProductById } from "./mock-data";
import type { CoupangProduct, SkuMaster, ValidationResult } from "@shared/schema";
import { parseCompositionWithLlm, type AiCompositionItem } from "./ai-composition";
import { scheduleJob } from "./jobs";
import { storeDataUrlImage, storeRemoteImagePlaceholder } from "./image-store";
import ExcelJS from "exceljs";

type CompositionMatch = SkuMaster & { matchScore: number };
type CompositionItemResult = {
  item: AiCompositionItem;
  queries: string[];
  matches: CompositionMatch[];
};

const uniqueStrings = (values: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = value.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }
  return result;
};

const parseFallbackComposition = (inputText: string): AiCompositionItem[] => {
  const chunks = inputText
    .split(/\r?\n|,|;|\//g)
    .map((part) => part.trim())
    .filter(Boolean);

  const seeds = chunks.length > 0 ? chunks : [inputText.trim()];
  return seeds.slice(0, 20).map((raw) => {
    const qtyMatch = raw.match(/^(.*?)(?:\s*(?:x|X|\*)\s*(\d{1,2}))$/);
    const name = (qtyMatch?.[1] || raw).trim();
    const quantityRaw = Number(qtyMatch?.[2] || 1);
    const quantity = Number.isFinite(quantityRaw) ? Math.max(1, Math.min(99, Math.floor(quantityRaw))) : 1;
    return {
      name,
      quantity,
      packHint: null,
      tasteHint: null,
      aliases: [],
      confidence: null,
    } satisfies AiCompositionItem;
  }).filter((item) => item.name.length > 0);
};

const scoreSku = (sku: SkuMaster, query: string, primary: boolean) => {
  const needle = query.toLowerCase();
  const skuCode = String(sku.sku || "").toLowerCase();
  const productName = String(sku.productName || "").toLowerCase();
  const brand = String(sku.brand || "").toLowerCase();
  const category = String(sku.category || "").toLowerCase();
  const memo = String(sku.memo || "").toLowerCase();

  let score = primary ? 30 : 15;
  if (skuCode === needle) score += 60;
  if (skuCode.includes(needle)) score += 25;
  if (productName.includes(needle)) score += 20;
  if (brand.includes(needle)) score += 10;
  if (category.includes(needle)) score += 8;
  if (memo.includes(needle)) score += 5;
  return score;
};

const toSafeLimit = (raw: unknown, fallback: number, min: number, max: number) => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ========================
  // A) Products (BigQuery / Mock)
  // ========================
  app.get("/api/coupang/products", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;
      const q = (req.query.q as string || "").toLowerCase();
      const statusFilter = req.query.status as string;

      let products = getMockProducts();

      if (q) {
        products = products.filter(p =>
          p.product_name.toLowerCase().includes(q) ||
          p.seller_product_code.toLowerCase().includes(q) ||
          p.product_id.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q)
        );
      }

      if (statusFilter) {
        products = products.filter(p => p.status === statusFilter);
      }

      const total = products.length;
      const items = products.slice(offset, offset + limit);

      res.json({ items, total });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ========================
  // B) Draft / Patch
  // ========================
  app.post("/api/draft/session", async (req, res) => {
    try {
      const { note, created_by } = req.body;
      const session = await storage.createDraftSession({
        note: note || null,
        createdBy: created_by || "system",
      });
      res.json({ sessionId: session.id });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/draft/sessions", async (_req, res) => {
    try {
      const sessions = await storage.getDraftSessions();
      res.json(sessions);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/draft/session/:id", async (req, res) => {
    try {
      const items = await storage.getDraftItems(req.params.id);
      const enriched = items.map(item => {
        const product = getMockProductById(item.productId);
        return { ...item, product };
      });
      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/draft/apply", async (req, res) => {
    try {
      const { sessionId, productId, patch, actor } = req.body;
      if (!sessionId || !productId) {
        return res.status(400).json({ message: "sessionId and productId required" });
      }

      const existingItems = await storage.getDraftItems(sessionId);
      const existingItem = existingItems.find(i => i.productId === productId);
      const oldPatch = (existingItem?.patchJson || {}) as Record<string, any>;

      const item = await storage.upsertDraftItem(sessionId, productId, patch || {});

      const product = getMockProductById(productId);
      for (const [field, newValue] of Object.entries(patch || {})) {
        const oldValue = oldPatch[field] !== undefined ? oldPatch[field] : (product ? (product as any)[field] : null);
        if (String(oldValue) !== String(newValue)) {
          await storage.createEditLog({
            actor: actor || "system",
            source: "ui",
            sessionId,
            productId,
            field,
            oldValue: oldValue != null ? String(oldValue) : null,
            newValue: newValue != null ? String(newValue) : null,
          });
        }
      }

      res.json(item);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/draft/rollback", async (req, res) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) return res.status(400).json({ message: "sessionId required" });

      await storage.deleteDraftItemsBySession(sessionId);

      await storage.createEditLog({
        actor: "system",
        source: "ui",
        sessionId,
        productId: "*",
        field: "rollback",
        oldValue: null,
        newValue: "session_rollback",
      });

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ========================
  // C) Validate
  // ========================
  app.post("/api/validate", async (req, res) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) return res.status(400).json({ message: "sessionId required" });

      const items = await storage.getDraftItems(sessionId);
      const errors: ValidationResult["errors"] = [];
      const warnings: ValidationResult["warnings"] = [];

      for (const item of items) {
        const product = getMockProductById(item.productId);
        const patch = (item.patchJson || {}) as Record<string, any>;
        const merged = { ...product, ...patch } as any;

        if (!merged.product_name || merged.product_name.trim() === "") {
          errors.push({ productId: item.productId, field: "product_name", message: "Product name is empty." });
        }

        const price = Number(merged.price);
        if (isNaN(price) || price <= 0) {
          errors.push({ productId: item.productId, field: "price", message: "Price must be greater than 0." });
        }

        const salePrice = Number(merged.sale_price);
        if (!isNaN(salePrice) && salePrice > 0 && salePrice > price) {
          warnings.push({ productId: item.productId, field: "sale_price", message: "Sale price is greater than price." });
        }

        if (merged.product_name && merged.product_name.length > 100) {
          warnings.push({ productId: item.productId, field: "product_name", message: `Product name length is ${merged.product_name.length}. (Recommended <= 100)` });
        }
      }

      const canExport = errors.length === 0;
      res.json({ errors, warnings, canExport });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ========================
  // D) Export xlsx
  // ========================
  app.post("/api/export/xlsx", async (req, res) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) return res.status(400).json({ message: "sessionId required" });

      const items = await storage.getDraftItems(sessionId);

      const errors: ValidationResult["errors"] = [];
      for (const item of items) {
        const product = getMockProductById(item.productId);
        const patch = (item.patchJson || {}) as Record<string, any>;
        const merged = { ...product, ...patch } as any;
        if (!merged.product_name || merged.product_name.trim() === "") {
          errors.push({ productId: item.productId, field: "product_name", message: "Missing product name" });
        }
        const price = Number(merged.price);
        if (isNaN(price) || price <= 0) {
          errors.push({ productId: item.productId, field: "price", message: "Invalid price" });
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({ message: "Validation errors exist. Resolve them before export.", errors });
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Product Data");

      sheet.columns = [
        { header: "Product ID", key: "product_id", width: 18 },
        { header: "Seller Code", key: "seller_product_code", width: 15 },
        { header: "Product Name", key: "product_name", width: 35 },
        { header: "Option", key: "option_text", width: 15 },
        { header: "Price", key: "price", width: 12 },
        { header: "Sale Price", key: "sale_price", width: 12 },
        { header: "Status", key: "status", width: 10 },
        { header: "Category ID", key: "category_id", width: 12 },
        { header: "Main Image", key: "images_main", width: 40 },
        { header: "Sub Image", key: "images_sub", width: 40 },
        { header: "Memo", key: "memo", width: 20 },
      ];

      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };

      for (const item of items) {
        const product = getMockProductById(item.productId);
        const patch = (item.patchJson || {}) as Record<string, any>;
        const merged = { ...product, ...patch };
        sheet.addRow(merged);
      }

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=kikit-export-${new Date().toISOString().slice(0, 10)}.xlsx`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ========================
  // E) Jobs (shared)
  // ========================
  app.post("/api/jobs", async (req, res) => {
    try {
      const { type, payload, created_by } = req.body;
      if (!type) return res.status(400).json({ message: "type is required" });

      const job = await storage.createJob({
        type,
        status: "queued",
        payloadJson: payload || {},
        createdBy: created_by || "system",
      });
      scheduleJob(job);
      res.json(job);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) return res.status(404).json({ message: "Job not found" });
      res.json(job);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/jobs", async (req, res) => {
    try {
      const jobs = await storage.getJobs({
        type: req.query.type as string,
        status: req.query.status as string,
        limit: toSafeLimit(req.query.limit, 20, 1, 200),
        offset: toSafeLimit(req.query.offset, 0, 0, 5000),
      });
      res.json(jobs);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ========================
  // F) Feature APIs
  // ========================
  app.post("/api/crawl", async (req, res) => {
    try {
      const { url, created_by } = req.body;
      const job = await storage.createJob({
        type: "CRAWL_URL",
        status: "queued",
        payloadJson: { url },
        createdBy: created_by || "system",
      });
      scheduleJob(job);
      res.json({ jobId: job.id, status: "queued" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/price/edit", async (req, res) => {
    try {
      const { items: editItems, created_by } = req.body;
      const job = await storage.createJob({
        type: "EDIT_PRICE",
        status: "queued",
        payloadJson: { items: editItems },
        createdBy: created_by || "system",
      });
      scheduleJob(job);
      res.json({ jobId: job.id, status: "queued" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/images/translate", async (req, res) => {
    try {
      const { imageId, imageUrl, targetLang, created_by } = req.body;
      if (!imageId && !imageUrl) {
        return res.status(400).json({ message: "imageId or imageUrl is required" });
      }

      const job = await storage.createJob({
        type: "IMAGE_TRANSLATE",
        status: "queued",
        payloadJson: { imageId, imageUrl, targetLang: targetLang || "ko" },
        createdBy: created_by || "system",
      });
      scheduleJob(job);
      res.json({ jobId: job.id, status: "queued" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/images/cutout", async (req, res) => {
    try {
      const { imageId, imageUrl, mask, created_by } = req.body;
      if (!imageId && !imageUrl) {
        return res.status(400).json({ message: "imageId or imageUrl is required" });
      }

      const job = await storage.createJob({
        type: "IMAGE_CUTOUT",
        status: "queued",
        payloadJson: { imageId, imageUrl, mask },
        createdBy: created_by || "system",
      });
      scheduleJob(job);
      res.json({ jobId: job.id, status: "queued" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // G) Image APIs
  app.post("/api/images/upload", async (req, res) => {
    try {
      const dataUrl = String(req.body?.dataUrl || "").trim();
      const sourceUrl = String(req.body?.sourceUrl || "").trim();
      const name = String(req.body?.name || "").trim() || null;

      if (!dataUrl && !sourceUrl) {
        return res.status(400).json({ message: "dataUrl or sourceUrl is required" });
      }

      let image;
      if (dataUrl) {
        const stored = await storeDataUrlImage(dataUrl, name);
        image = await storage.createAssetImage({
          sourceType: "upload",
          sourceUrl: null,
          storedUrl: stored.storedUrl,
          mime: stored.mime,
          metaJson: {
            originalName: stored.originalName,
            size: stored.size,
          },
        });
      } else {
        const stored = storeRemoteImagePlaceholder(sourceUrl);
        image = await storage.createAssetImage({
          sourceType: "remote",
          sourceUrl,
          storedUrl: stored.storedUrl,
          mime: stored.mime,
          metaJson: {
            originalName: name || stored.originalName,
          },
        });
      }

      res.json(image);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/images/list", async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      const limit = toSafeLimit(req.query.limit, 100, 1, 200);
      const images = await storage.listAssetImages({ q, limit });
      res.json(images);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/images/:id/derivatives", async (req, res) => {
    try {
      const kind = String(req.query.kind || "").trim() || undefined;
      const derivatives = await storage.listAssetDerivatives(req.params.id, kind);
      res.json(derivatives);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // SKU search
  app.post("/api/sku/compose-search", async (req, res) => {
    try {
      const inputText = String(req.body?.text ?? "").trim();
      if (!inputText) {
        return res.status(400).json({ message: "text is required" });
      }

      const rawLimit = Number(req.body?.limitPerItem ?? 8);
      const limitPerItem = Number.isFinite(rawLimit)
        ? Math.max(1, Math.min(20, Math.floor(rawLimit)))
        : 8;

      const llm = await parseCompositionWithLlm(inputText);
      const itemsToMatch = llm.used && llm.items.length > 0
        ? llm.items
        : parseFallbackComposition(inputText);

      const itemResults: CompositionItemResult[] = [];
      for (const item of itemsToMatch) {
        const queries = uniqueStrings([item.name, ...item.aliases]).slice(0, 5);
        const safeQueries = queries.length > 0 ? queries : [item.name];
        const ranked = new Map<string, { sku: SkuMaster; score: number }>();

        for (let i = 0; i < safeQueries.length; i += 1) {
          const query = safeQueries[i];
          if (query.length < 2) continue;
          const rows = await storage.searchSku(query);
          rows.forEach((row) => {
            const key = row.id || row.sku;
            const delta = scoreSku(row, query, i === 0);
            const existing = ranked.get(key);
            if (existing) {
              existing.score += delta;
            } else {
              ranked.set(key, { sku: row, score: delta });
            }
          });
        }

        const matches: CompositionMatch[] = Array.from(ranked.values())
          .sort((a, b) => b.score - a.score)
          .slice(0, limitPerItem)
          .map((entry) => ({ ...entry.sku, matchScore: entry.score }));

        itemResults.push({
          item,
          queries: safeQueries,
          matches,
        });
      }

      return res.json({
        input: inputText,
        llm,
        itemResults,
        totalMatches: itemResults.reduce((sum, item) => sum + item.matches.length, 0),
      });
    } catch (err: any) {
      return res.status(500).json({ message: err?.message || "compose-search failed" });
    }
  });

  app.get("/api/sku/search", async (req, res) => {
    try {
      const q = String(req.query.q ?? "").trim();
      if (!q) return res.json([]);
      const results = await storage.searchSku(q);
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Settings status
  app.get("/api/settings/status", async (_req, res) => {
    const mockMode = process.env.MOCK_MODE === "true";
    let pgConnected = false;
    try {
      await storage.getDraftSessions();
      pgConnected = true;
    } catch { }
    res.json({
      mockMode,
      pgConnected,
      bqConnected: false,
    });
  });

  return httpServer;
}

