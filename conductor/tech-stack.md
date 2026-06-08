# Tech Stack: Alete Gate

## Monorepo Management

- **pnpm Workspaces:** Managing workspace packages including `@alete-ai/gate-ingest` and native SPM package `AleteGateKit`.

## Native Classifier Substrate (AleteGateKit)

- **Language:** Swift 6 (Strict Concurrency).
- **Framework:** Apple NLModel / CoreML.
- **Training Substrate:** Maximum Entropy classifier via `CreateML` (`MLTextClassifier`).
- **Test Substrate:** XCTest / Swift Testing using `verify_model.swift` harness.

## Ingest Pipeline Package (@alete-ai/gate-ingest)

- **Language:** TypeScript / JavaScript.
- **Build Tool:** tsup / esbuild (producing zero-dependency browser ESM bundle).
- **Content Parsing:** `@mdream/js` for Markdown structural and semantic extraction.
- **Scraping Substrate:** `@mendable/firecrawl-js` (local Firecrawl self-host).

## Development and Verification Runtimes

- **Local Datasets:**
  - `data/raw/` for raw scraped HTML portals, articles, and noise.
  - `data/processed/training_set.json` (uncompressed text + labels) and `data/processed/training_set.csv` (used for CreateML training).
- **Staging Database Integration:**
  - Direct connection to MongoDB Atlas staging cluster `vedai-cluster-staging.952n7om.mongodb.net` under database `vedai_db` and collection `raw_staging_extractions`.
