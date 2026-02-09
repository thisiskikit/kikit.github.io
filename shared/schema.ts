import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, uuid, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const draftSessions = pgTable("draft_session", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: text("created_by").notNull().default("system"),
  note: text("note"),
});

export const insertDraftSessionSchema = createInsertSchema(draftSessions).omit({ id: true, createdAt: true });
export type InsertDraftSession = z.infer<typeof insertDraftSessionSchema>;
export type DraftSession = typeof draftSessions.$inferSelect;

export const draftItems = pgTable("draft_item", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id").notNull().references(() => draftSessions.id),
  productId: text("product_id").notNull(),
  patchJson: jsonb("patch_json").notNull().default({}),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDraftItemSchema = createInsertSchema(draftItems).omit({ id: true, updatedAt: true });
export type InsertDraftItem = z.infer<typeof insertDraftItemSchema>;
export type DraftItem = typeof draftItems.$inferSelect;

export const opsEditLogs = pgTable("ops_edit_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  actor: text("actor").notNull().default("system"),
  source: text("source").notNull().default("ui"),
  sessionId: uuid("session_id"),
  productId: text("product_id").notNull(),
  field: text("field").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
});

export const insertOpsEditLogSchema = createInsertSchema(opsEditLogs).omit({ id: true, createdAt: true });
export type InsertOpsEditLog = z.infer<typeof insertOpsEditLogSchema>;
export type OpsEditLog = typeof opsEditLogs.$inferSelect;

export const opsJobs = pgTable("ops_job", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  status: text("status").notNull().default("queued"),
  payloadJson: jsonb("payload_json").notNull().default({}),
  resultJson: jsonb("result_json"),
  errorText: text("error_text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  createdBy: text("created_by").notNull().default("system"),
});

export const insertOpsJobSchema = createInsertSchema(opsJobs).omit({ id: true, createdAt: true, startedAt: true, finishedAt: true });
export type InsertOpsJob = z.infer<typeof insertOpsJobSchema>;
export type OpsJob = typeof opsJobs.$inferSelect;

export const crawlSources = pgTable("crawl_source", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull(),
  fetchedAt: timestamp("fetched_at"),
  htmlRaw: text("html_raw"),
  metaJson: jsonb("meta_json").default({}),
  hash: text("hash"),
  createdBy: text("created_by").notNull().default("system"),
});

export const productTemplates = pgTable("product_template", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceType: text("source_type").notNull().default("manual"),
  sourceId: uuid("source_id"),
  normalizedJson: jsonb("normalized_json").notNull().default({}),
  version: text("version").notNull().default("1.0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const assetImages = pgTable("asset_image", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceType: text("source_type").notNull().default("upload"),
  sourceUrl: text("source_url"),
  storedUrl: text("stored_url"),
  width: integer("width"),
  height: integer("height"),
  mime: text("mime"),
  metaJson: jsonb("meta_json").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assetDerivatives = pgTable("asset_derivative", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  imageId: uuid("image_id").notNull().references(() => assetImages.id),
  kind: text("kind").notNull(),
  paramsJson: jsonb("params_json").default({}),
  outputUrl: text("output_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const skuMaster = pgTable("sku_master", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sku: text("sku").notNull().unique(),
  productName: text("product_name").notNull(),
  brand: text("brand"),
  category: text("category"),
  memo: text("memo"),
});

export const insertSkuMasterSchema = createInsertSchema(skuMaster).omit({ id: true });
export type InsertSkuMaster = z.infer<typeof insertSkuMasterSchema>;
export type SkuMaster = typeof skuMaster.$inferSelect;

export const categoryMap = pgTable("category_map", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: text("category_id").notNull().unique(),
  categoryName: text("category_name").notNull(),
  parentId: text("parent_id"),
});

export const insertCategoryMapSchema = createInsertSchema(categoryMap).omit({ id: true });
export type InsertCategoryMap = z.infer<typeof insertCategoryMapSchema>;
export type CategoryMap = typeof categoryMap.$inferSelect;

export interface CoupangProduct {
  product_id: string;
  seller_product_code: string;
  product_name: string;
  option_text: string;
  price: number;
  sale_price: number;
  status: string;
  category_id: string;
  category_name: string;
  images_main: string;
  images_sub: string;
  brand: string;
  stock: number;
  memo: string;
}

export interface ValidationResult {
  errors: { productId: string; field: string; message: string }[];
  warnings: { productId: string; field: string; message: string }[];
  canExport: boolean;
}
