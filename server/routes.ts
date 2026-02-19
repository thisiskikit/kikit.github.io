import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getMockProducts, getMockProductById } from "./mock-data";
import type { CoupangProduct, SkuMaster, ValidationResult } from "@shared/schema";
import { parseCompositionWithLlm, type AiCompositionItem } from "./ai-composition";
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
          errors.push({ productId: item.productId, field: "product_name", message: "상품명이 비어있습니다." });
        }

        const price = Number(merged.price);
        if (isNaN(price) || price <= 0) {
          errors.push({ productId: item.productId, field: "price", message: "가격은 0보다 커야 합니다." });
        }

        const salePrice = Number(merged.sale_price);
        if (!isNaN(salePrice) && salePrice > 0 && salePrice > price) {
          warnings.push({ productId: item.productId, field: "sale_price", message: "할인가가 판매가보다 높습니다." });
        }

        if (merged.product_name && merged.product_name.length > 100) {
          warnings.push({ productId: item.productId, field: "product_name", message: `상품명이 ${merged.product_name.length}자입니다. (권장: 100자 이하)` });
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
          errors.push({ productId: item.productId, field: "product_name", message: "상품명 누락" });
        }
        const price = Number(merged.price);
        if (isNaN(price) || price <= 0) {
          errors.push({ productId: item.productId, field: "price", message: "가격 오류" });
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({ message: "검증 에러가 있어 Export할 수 없습니다. 먼저 검증 페이지에서 에러를 해결하세요.", errors });
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("상품 데이터");

      sheet.columns = [
        { header: "상품ID", key: "product_id", width: 18 },
        { header: "셀러상품코드", key: "seller_product_code", width: 15 },
        { header: "상품명", key: "product_name", width: 35 },
        { header: "옵션", key: "option_text", width: 15 },
        { header: "판매가", key: "price", width: 12 },
        { header: "할인가", key: "sale_price", width: 12 },
        { header: "상태", key: "status", width: 10 },
        { header: "카테고리ID", key: "category_id", width: 12 },
        { header: "메인이미지", key: "images_main", width: 40 },
        { header: "서브이미지", key: "images_sub", width: 40 },
        { header: "메모", key: "memo", width: 20 },
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
  // E) Jobs (공통)
  // ========================
  app.post("/api/jobs", async (req, res) => {
    try {
      const { type, payload, created_by } = req.body;
      const job = await storage.createJob({
        type,
        status: "queued",
        payloadJson: payload || {},
        createdBy: created_by || "system",
      });
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
        limit: parseInt(req.query.limit as string) || 20,
        offset: parseInt(req.query.offset as string) || 0,
      });
      res.json(jobs);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ========================
  // F) Feature APIs (stubs)
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
      res.json({ jobId: job.id, status: "queued" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/images/translate", async (req, res) => {
    try {
      const { imageId, imageUrl, targetLang, created_by } = req.body;
      const job = await storage.createJob({
        type: "IMAGE_TRANSLATE",
        status: "queued",
        payloadJson: { imageId, imageUrl, targetLang: targetLang || "ko" },
        createdBy: created_by || "system",
      });
      res.json({ jobId: job.id, status: "queued" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/images/cutout", async (req, res) => {
    try {
      const { imageId, imageUrl, mask, created_by } = req.body;
      const job = await storage.createJob({
        type: "IMAGE_CUTOUT",
        status: "queued",
        payloadJson: { imageId, imageUrl, mask },
        createdBy: created_by || "system",
      });
      res.json({ jobId: job.id, status: "queued" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // G) Image hosting stubs
  app.post("/api/images/upload", async (_req, res) => {
    // TODO: 실제 서버 경로 D:\Dev\hosting\uploads
    res.json({ storedUrl: "https://img.aboutfactory.co.kr/mock/uploaded-image.jpg", message: "Mock upload (stub)" });
  });

  app.get("/api/images/list", async (_req, res) => {
    res.json([
      { url: "https://img.aboutfactory.co.kr/mock/sample1.jpg", name: "sample1.jpg" },
      { url: "https://img.aboutfactory.co.kr/mock/sample2.jpg", name: "sample2.jpg" },
    ]);
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
