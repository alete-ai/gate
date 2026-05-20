# Implementation Plan: PrivacyGatekeeper Classifier

## Phase 1: Data Synthesis & Edge Model Training

### 1. Ingestion Package Development (`@alete/gate-ingest`)
Establish the single source of truth for data processing.
- [x] Scaffold `packages/gate-ingest` with TypeScript support.
- [x] Centralize `@mdream/js` `tagOverrides` to retain structural HTML (Forms, Inputs, Nav).
- [x] Implement the `TokenMapper` to convert Markdown/HTML artifacts into alphanumeric tokens (e.g., `structFormStart`).
- [x] Export a `process(html: string): string` function for both Node.js (synthesis) and Browser (extension) contexts.

### 2. Data Sourcing Strategy (Raw HTML Acquisition)
Establish a robust pipeline for gathering real-world structural data.
- [ ] **Cyber Security Datasets:** Extract raw HTML of financial/medical portals from phishing datasets (WebPhish, PhishLang).
- [ ] **Structural Web Datasets:** Utilize WebSRC or WebCode2M for layout diversity.
- [x] **Targeted Automated Scrape (Auto-Curator):** 
  - Implement `scripts/auto_curate.ts` using **Firecrawl** for resilient scraping.
  - Target ~100+ public forms/calculators (Sensitive Portals) and ~100+ news/blogs (Digestible Articles).
  - Capture both raw HTML (for `gate-ingest` processing) and Markdown (for semantic reference).
  - Save to `data/raw/` for the synthesis pipeline.

### 3. Training Data Compilation
- [x] Update `scripts/synthesize.js` to use `@alete/gate-ingest`.
- [x] Generate `data/processed/training_set.json` (Text + Label).
- [x] Convert JSON to `data/processed/training_set.csv` for Create ML ingestion.

### 4. Native Model Training (Create ML)
- [x] Open Xcode -> Developer Tools -> Create ML. (Note: Scripted training in scripts/train_model.swift)
- [x] Train on the token-mapped CSV using the Maximum Entropy algorithm.
- [x] Validate for High Recall on `sensitive_portal`.
- [x] Export and store `models/PrivacyGatekeeper.mlpackage` in the repository. (Note: Currently as .mlmodel for easier scripted verification)

## Phase 2: Integration & Verification
- [x] Create a test harness (`scripts/verify_model.swift`) to verify the `.mlmodel` on the processed dataset.
- [x] Benchmark latency (Result: ~3.2ms avg, well within the < 50ms goal).
- [x] Verify Survival Metric: 100% Recall on `sensitive_portal` leakage to `digestible_article`.
- [x] Establish **Parity Audit** between TypeScript `gate-ingest` and Swift `NLModel` tokenization.
  - Added `structStateLoading`, `structStateWaiting`, `structStateAuth` tokens.
  - Improved `sensitive_portal` recall to 97.44% in native substrate.
- [x] Implement **Redactor** in `gate-ingest` pipeline. (Note: Deprecated and removed in v0.1.3 for strategic simplification and performance).
  - Ported `openredaction` logic from `~/git/edge`.
  - Adopts "Narrative-First" strategy.
- [x] Optimize **Packaging** for Browser Extensions (WXT).
  - Configured `tsup` for dual Node/Browser builds.
  - Bundled `@mdream/js` into a single 42KB browser ESM (reduced from 332KB after removing `openredaction`).
  - Implemented Node.js built-in shims (`fs`, `crypto`, `path`) for extension compatibility.
- [x] Evaluate `noise` vs `sensitive_portal` confusion on SPA loading states (Index 90).
  - Resolved via `structStateLoading` token mapping.
- [x] Implement Native Bridge for WKWebView / Safari Extension.
  - Created `ios/AleteGateKit` Swift Package.
  - Implemented `GateClassifier` with auto-compiling model substrate.
  - Verified logic via Swift Package tests (100% success on safety checks).
  - Aligned linguistic tone and branding across all substrates.
- [ ] Integrate `AleteGateKit` into the main iOS app target.
