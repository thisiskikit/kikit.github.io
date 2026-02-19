import { eq, and, or, ilike, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  draftSessions, draftItems, opsEditLogs, opsJobs,
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
  searchSku(q: string): Promise<SkuMaster[]>;
  seedData(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
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
    const [job] = await db.insert(opsJobs).values(data).returning();
    return job;
  }

  async getJob(id: string): Promise<OpsJob | undefined> {
    const [job] = await db.select().from(opsJobs).where(eq(opsJobs.id, id));
    return job;
  }

  async getJobs(filters: { type?: string; status?: string; limit?: number; offset?: number }): Promise<OpsJob[]> {
    let query = db.select().from(opsJobs);
    const conditions = [];
    if (filters.type) conditions.push(eq(opsJobs.type, filters.type));
    if (filters.status) conditions.push(eq(opsJobs.status, filters.status));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return query
      .orderBy(desc(opsJobs.createdAt))
      .limit(filters.limit || 20)
      .offset(filters.offset || 0);
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

    return db.select().from(skuMaster)
      .where(and(...termConditions))
      .limit(50);
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
