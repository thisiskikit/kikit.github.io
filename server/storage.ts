import { randomUUID } from "crypto";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  draftSessions, draftItems, opsEditLogs, opsJobs,
  assetImages, assetDerivatives,
  skuMaster, categoryMap,
  type DraftSession, type InsertDraftSession,
  type DraftItem, type InsertDraftItem,
  type OpsEditLog, type InsertOpsEditLog,
  type OpsJob, type InsertOpsJob,
  type SkuMaster, type InsertSkuMaster,
  type CategoryMap, type InsertCategoryMap,
} from "@shared/schema";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool);

const fallbackSkuMaster: SkuMaster[] = [
  { id: "mock-kk-00001", sku: "KK-00001", productName: "Stainless Bottle 500ml", brand: "KIKIT HOME", category: "Kitchen", memo: "best seller" },
  { id: "mock-kk-00002", sku: "KK-00002", productName: "Silicone Kitchen Mat Large", brand: "KIKIT HOME", category: "Kitchen", memo: "" },
  { id: "mock-kk-00003", sku: "KK-00003", productName: "Wood Cutting Board Anti-bacterial", brand: "PREMIUM HOUSE", category: "Kitchen", memo: "new" },
  { id: "mock-kk-00004", sku: "KK-00004", productName: "Wireless LED Mood Lamp", brand: "SMART LIVING", category: "Interior", memo: "" },
  { id: "mock-kk-00005", sku: "KK-00005", productName: "Foldable Drying Rack 3 Tier", brand: "ECO LIFE", category: "Living", memo: "seasonal" },
  { id: "mock-kk-00006", sku: "KK-00006", productName: "Premium Microfiber Towel Set", brand: "MODERN STYLE", category: "Bath", memo: "" },
  { id: "mock-kk-00007", sku: "KK-00007", productName: "Auto Sensor Trash Bin 12L", brand: "SMART LIVING", category: "Living", memo: "" },
  { id: "mock-kk-00008", sku: "KK-00008", productName: "Cordless Handy Vacuum", brand: "DAILY GOODS", category: "Electronics", memo: "popular" },
];

const normalizeSkuTerms = (q: string) => q.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);

const filterFallbackSku = (q: string) => {
  const terms = normalizeSkuTerms(q).map((term) => term.toLowerCase());
  if (terms.length === 0) return [];

  return fallbackSkuMaster
    .filter((row) => {
      const haystack = [
        row.sku,
        row.productName,
        row.brand || "",
        row.category || "",
        row.memo || "",
      ].join(" ").toLowerCase();
      return terms.every((term) => haystack.includes(term));
    })
    .slice(0, 50);
};

type AssetImage = typeof assetImages.$inferSelect;
type AssetImageInsert = Omit<typeof assetImages.$inferInsert, "id" | "createdAt">;
type AssetDerivative = typeof assetDerivatives.$inferSelect;
type AssetDerivativeInsert = Omit<typeof assetDerivatives.$inferInsert, "id" | "createdAt">;
type UpdateOpsJobPatch = Partial<Pick<OpsJob, "status" | "payloadJson" | "resultJson" | "errorText" | "startedAt" | "finishedAt">>;

export interface IStorage {
  createDraftSession(data: InsertDraftSession): Promise<DraftSession>;
  getDraftSessions(): Promise<DraftSession[]>;
  getDraftSession(id: string): Promise<DraftSession | undefined>;
  getDraftItems(sessionId: string): Promise<DraftItem[]>;
  upsertDraftItem(sessionId: string, productId: string, patchJson: Record<string, any>): Promise<DraftItem>;
  deleteDraftItemsBySession(sessionId: string): Promise<void>;
  createEditLog(data: InsertOpsEditLog): Promise<OpsEditLog>;
  createJob(data: InsertOpsJob): Promise<OpsJob>;
  getJob(id: string): Promise<OpsJob | undefined>;
  getJobs(filters: { type?: string; status?: string; limit?: number; offset?: number }): Promise<OpsJob[]>;
  updateJob(id: string, patch: UpdateOpsJobPatch): Promise<OpsJob | undefined>;
  createAssetImage(data: AssetImageInsert): Promise<AssetImage>;
  getAssetImage(id: string): Promise<AssetImage | undefined>;
  listAssetImages(filters: { q?: string; limit?: number }): Promise<AssetImage[]>;
  createAssetDerivative(data: AssetDerivativeInsert): Promise<AssetDerivative>;
  listAssetDerivatives(imageId: string, kind?: string): Promise<AssetDerivative[]>;
  searchSku(q: string): Promise<SkuMaster[]>;
  seedData(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private memoryJobs: OpsJob[] = [];
  private memoryImages: AssetImage[] = [];
  private memoryDerivatives: AssetDerivative[] = [];

  async createDraftSession(data: InsertDraftSession): Promise<DraftSession> {
    const [session] = await db.insert(draftSessions).values(data).returning();
    return session;
  }

  async getDraftSessions(): Promise<DraftSession[]> {
    return db.select().from(draftSessions).orderBy(desc(draftSessions.createdAt)).limit(50);
  }

  async getDraftSession(id: string): Promise<DraftSession | undefined> {
    const [session] = await db.select().from(draftSessions).where(eq(draftSessions.id, id));
    return session;
  }

  async getDraftItems(sessionId: string): Promise<DraftItem[]> {
    return db.select().from(draftItems).where(eq(draftItems.sessionId, sessionId));
  }

  async upsertDraftItem(sessionId: string, productId: string, patchJson: Record<string, any>): Promise<DraftItem> {
    const existing = await db.select().from(draftItems)
      .where(and(eq(draftItems.sessionId, sessionId), eq(draftItems.productId, productId)));

    if (existing.length > 0) {
      const merged = { ...((existing[0].patchJson as Record<string, any>) || {}), ...patchJson };
      const [updated] = await db.update(draftItems)
        .set({ patchJson: merged, updatedAt: new Date() })
        .where(eq(draftItems.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [item] = await db.insert(draftItems).values({
        sessionId,
        productId,
        patchJson,
      }).returning();
      return item;
    }
  }

  async deleteDraftItemsBySession(sessionId: string): Promise<void> {
    await db.delete(draftItems).where(eq(draftItems.sessionId, sessionId));
  }

  async createEditLog(data: InsertOpsEditLog): Promise<OpsEditLog> {
    const [log] = await db.insert(opsEditLogs).values(data).returning();
    return log;
  }

  async createJob(data: InsertOpsJob): Promise<OpsJob> {
    try {
      const [job] = await db.insert(opsJobs).values(data).returning();
      return job;
    } catch {
      const now = new Date();
      const job: OpsJob = {
        id: randomUUID(),
        type: data.type,
        status: data.status || "queued",
        payloadJson: data.payloadJson || {},
        resultJson: null,
        errorText: null,
        createdAt: now,
        startedAt: null,
        finishedAt: null,
        createdBy: data.createdBy || "system",
      };
      this.memoryJobs.unshift(job);
      return job;
    }
  }

  async getJob(id: string): Promise<OpsJob | undefined> {
    try {
      const [job] = await db.select().from(opsJobs).where(eq(opsJobs.id, id));
      if (job) return job;
    } catch {
      // Fallback handled below.
    }
    return this.memoryJobs.find((job) => job.id === id);
  }

  async getJobs(filters: { type?: string; status?: string; limit?: number; offset?: number }): Promise<OpsJob[]> {
    try {
      let query = db.select().from(opsJobs);
      const conditions = [];
      if (filters.type) conditions.push(eq(opsJobs.type, filters.type));
      if (filters.status) conditions.push(eq(opsJobs.status, filters.status));

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      return await query
        .orderBy(desc(opsJobs.createdAt))
        .limit(filters.limit || 20)
        .offset(filters.offset || 0);
    } catch {
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;
      const filtered = this.memoryJobs
        .filter((job) => {
          if (filters.type && job.type !== filters.type) return false;
          if (filters.status && job.status !== filters.status) return false;
          return true;
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return filtered.slice(offset, offset + limit);
    }
  }

  async updateJob(id: string, patch: UpdateOpsJobPatch): Promise<OpsJob | undefined> {
    const updatePayload = {
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.payloadJson !== undefined ? { payloadJson: patch.payloadJson } : {}),
      ...(patch.resultJson !== undefined ? { resultJson: patch.resultJson } : {}),
      ...(patch.errorText !== undefined ? { errorText: patch.errorText } : {}),
      ...(patch.startedAt !== undefined ? { startedAt: patch.startedAt } : {}),
      ...(patch.finishedAt !== undefined ? { finishedAt: patch.finishedAt } : {}),
    };

    try {
      const [updated] = await db.update(opsJobs).set(updatePayload).where(eq(opsJobs.id, id)).returning();
      if (updated) return updated;
    } catch {
      // Fallback handled below.
    }

    const index = this.memoryJobs.findIndex((job) => job.id === id);
    if (index < 0) return undefined;
    const updatedJob: OpsJob = { ...this.memoryJobs[index], ...patch };
    this.memoryJobs[index] = updatedJob;
    return updatedJob;
  }

  async createAssetImage(data: AssetImageInsert): Promise<AssetImage> {
    try {
      const [row] = await db.insert(assetImages).values(data).returning();
      return row;
    } catch {
      const row: AssetImage = {
        id: randomUUID(),
        sourceType: data.sourceType || "upload",
        sourceUrl: data.sourceUrl ?? null,
        storedUrl: data.storedUrl ?? null,
        width: data.width ?? null,
        height: data.height ?? null,
        mime: data.mime ?? null,
        metaJson: (data.metaJson as Record<string, any> | null | undefined) ?? {},
        createdAt: new Date(),
      };
      this.memoryImages.unshift(row);
      return row;
    }
  }

  async getAssetImage(id: string): Promise<AssetImage | undefined> {
    try {
      const [row] = await db.select().from(assetImages).where(eq(assetImages.id, id));
      if (row) return row;
    } catch {
      // Fallback handled below.
    }
    return this.memoryImages.find((row) => row.id === id);
  }

  async listAssetImages(filters: { q?: string; limit?: number }): Promise<AssetImage[]> {
    const q = String(filters.q || "").trim();
    const limit = Math.max(1, Math.min(200, filters.limit || 50));

    try {
      let query = db.select().from(assetImages);
      if (q) {
        const pattern = `%${q}%`;
        query = query.where(
          or(
            ilike(assetImages.sourceUrl, pattern),
            ilike(assetImages.storedUrl, pattern),
            ilike(assetImages.mime, pattern),
          )
        ) as any;
      }

      return await query
        .orderBy(desc(assetImages.createdAt))
        .limit(limit);
    } catch {
      const needle = q.toLowerCase();
      const filtered = this.memoryImages.filter((row) => {
        if (!needle) return true;
        const haystack = [
          row.sourceType || "",
          row.sourceUrl || "",
          row.storedUrl || "",
          row.mime || "",
          JSON.stringify(row.metaJson || {}),
        ].join(" ").toLowerCase();
        return haystack.includes(needle);
      });
      return filtered
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);
    }
  }

  async createAssetDerivative(data: AssetDerivativeInsert): Promise<AssetDerivative> {
    try {
      const [row] = await db.insert(assetDerivatives).values(data).returning();
      return row;
    } catch {
      const row: AssetDerivative = {
        id: randomUUID(),
        imageId: data.imageId,
        kind: data.kind,
        paramsJson: (data.paramsJson as Record<string, any> | null | undefined) ?? {},
        outputUrl: data.outputUrl ?? null,
        createdAt: new Date(),
      };
      this.memoryDerivatives.unshift(row);
      return row;
    }
  }

  async listAssetDerivatives(imageId: string, kind?: string): Promise<AssetDerivative[]> {
    const normalizedKind = kind?.trim();
    try {
      const conditions = [eq(assetDerivatives.imageId, imageId)];
      if (normalizedKind) {
        conditions.push(eq(assetDerivatives.kind, normalizedKind));
      }
      return await db.select().from(assetDerivatives)
        .where(and(...conditions))
        .orderBy(desc(assetDerivatives.createdAt))
        .limit(100);
    } catch {
      return this.memoryDerivatives
        .filter((row) => {
          if (row.imageId !== imageId) return false;
          if (normalizedKind && row.kind !== normalizedKind) return false;
          return true;
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
  }

  async searchSku(q: string): Promise<SkuMaster[]> {
    const normalizedQuery = q.trim().replace(/\s+/g, " ");
    if (!normalizedQuery) return [];

    const terms = normalizedQuery.split(" ");
    const termConditions = terms.map(term => {
      const pattern = `%${term}%`;
      return or(
        ilike(skuMaster.sku, pattern),
        ilike(skuMaster.productName, pattern),
        ilike(skuMaster.brand, pattern),
        ilike(skuMaster.category, pattern),
        ilike(skuMaster.memo, pattern),
      );
    });

    try {
      return await db.select().from(skuMaster)
        .where(and(...termConditions))
        .limit(50);
    } catch {
      return filterFallbackSku(normalizedQuery);
    }
  }

  async seedData(): Promise<void> {
    const existingSkus = await db.select().from(skuMaster).limit(1);
    if (existingSkus.length > 0) return;

    await db.insert(skuMaster).values([
      { sku: "KK-00001", productName: "스테인리스 보온병 500ml", brand: "키킷홈", category: "주방용품", memo: "베스트셀러" },
      { sku: "KK-00002", productName: "실리콘 주방매트 대형", brand: "키킷홈", category: "주방용품", memo: "" },
      { sku: "KK-00003", productName: "원목 도마 항균코팅", brand: "프리미엄하우스", category: "주방용품", memo: "신상품" },
      { sku: "KK-00004", productName: "무선 충전 LED 무드등", brand: "스마트리빙", category: "인테리어소품", memo: "" },
      { sku: "KK-00005", productName: "접이식 빨래건조대 3단", brand: "에코라이프", category: "생활용품", memo: "시즌상품" },
      { sku: "KK-00006", productName: "프리미엄 극세사 수건 세트", brand: "모던스타일", category: "욕실용품", memo: "" },
      { sku: "KK-00007", productName: "자동 센서 쓰레기통 12L", brand: "스마트리빙", category: "생활용품", memo: "" },
      { sku: "KK-00008", productName: "코드리스 핸디 청소기", brand: "데일리굿즈", category: "가전/디지털", memo: "인기상품" },
    ]);

    await db.insert(categoryMap).values([
      { categoryId: "CAT001", categoryName: "주방용품", parentId: null },
      { categoryId: "CAT002", categoryName: "생활용품", parentId: null },
      { categoryId: "CAT003", categoryName: "수납/정리", parentId: null },
      { categoryId: "CAT004", categoryName: "욕실용품", parentId: null },
      { categoryId: "CAT005", categoryName: "인테리어소품", parentId: null },
      { categoryId: "CAT006", categoryName: "가전/디지털", parentId: null },
    ]);
  }
}

export const storage = new DatabaseStorage();
