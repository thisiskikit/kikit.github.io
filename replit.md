# KIKIT - 업로드 / 상품 수정 도우미

## Overview
KIKIT is a Korean-language internal web app for managing Coupang product uploads and edits. It features product listing from BigQuery (mock mode), draft editing, validation, Excel export, and tools for box packing and detail page building.

## Architecture
- **Frontend**: React + Vite + TypeScript + Tailwind + shadcn/ui
- **Backend**: Express + TypeScript
- **Database**: PostgreSQL (Drizzle ORM)
- **Data Source**: BigQuery (mock mode with MOCK_MODE=true)
- **Export**: exceljs for xlsx generation

## Project Structure
```
client/src/
  App.tsx                     - Main app with sidebar layout
  components/
    app-sidebar.tsx           - Navigation sidebar (Korean labels + HelpTips)
    help-tip.tsx              - Reusable tooltip component
    page-header.tsx           - Page header with help tooltip
    stub-page.tsx             - Template for locked/future feature pages
    ui/                       - shadcn/ui components
  pages/
    products.tsx              - Product listing (P0)
    draft.tsx                 - Draft editing (P0)
    validate.tsx              - Validation (P0)
    export.tsx                - Excel export (P0)
    settings.tsx              - Settings (P0)
    tools-box-packing.tsx     - Box packing tool (P0)
    tools-detail-builder.tsx  - Detail page builder (P0)
    feature-crawler.tsx       - URL crawling (stub)
    feature-price-editor.tsx  - Price editor (stub)
    feature-image-translate.tsx - Image translation (stub)
    feature-image-cutout.tsx  - Image cutout (stub)
    feature-sku-search.tsx    - SKU search (partial)

server/
  index.ts                    - Express server entry
  routes.ts                   - All API routes
  storage.ts                  - Database storage layer (Drizzle)
  mock-data.ts                - Mock product data generator (200 products)

shared/
  schema.ts                   - Drizzle schemas + TypeScript types
```

## Database Tables
- draft_session, draft_item - Draft management
- ops_edit_log - Audit logging
- ops_job - Background job queue
- crawl_source, product_template - Crawling (future)
- asset_image, asset_derivative - Image assets (future)
- sku_master, category_map - Master data

## API Endpoints
- GET /api/coupang/products - Product listing
- POST/GET /api/draft/session(s) - Draft sessions
- PATCH /api/draft/apply - Apply patch
- POST /api/draft/rollback - Rollback session
- POST /api/validate - Validation
- POST /api/export/xlsx - Excel export
- POST/GET /api/jobs - Job queue
- GET /api/sku/search - SKU search
- GET /api/settings/status - App status
- Feature stubs: /api/crawl, /api/price/edit, /api/images/*

## Environment Variables
- MOCK_MODE=true - Use mock data instead of BigQuery
- DATABASE_URL - PostgreSQL connection string

## Recent Changes
- 2026-02-09: Initial implementation of full KIKIT app
