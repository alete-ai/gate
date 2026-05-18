# Implementation Plan: PrivacyGatekeeper Classifier

## Phase 1: Data Synthesis & Edge Model Training

### 1. Ingestion Package Development (`@alete/gate-ingest`)
Establish the single source of truth for data processing.
- [x] Scaffold `packages/gate-ingest` with TypeScript support.
- [x] Centralize `@mdream/js` `tagOverrides` to retain structural HTML (Forms, Inputs, Nav).
- [x] Implement the `TokenMapper` to convert Markdown/HTML artifacts into alphanumeric tokens (e.g., `structFormStart`).
- [x] Export a `process(html: string): string` function for both Node.js (synthesis) and Browser (extension) contexts.

### 2. Data Sourcing Strategy (Raw HTML Acquisition)
- [ ] **Cyber Security Datasets:** Extract raw HTML of financial/medical portals from phishing datasets (WebPhish, PhishLang).
- [ ] **Structural Web Datasets:** Utilize WebSRC or WebCode2M for layout diversity.
- [ ] **Targeted Automated Scrape:** Build a custom scraping script with hydration delays to capture Substack/News vs. Banking/Health HTML.

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
- [ ] Create a test harness to verify the `.mlpackage` on unseen HTML samples.
- [ ] Benchmark latency (Goal: < 50ms) and memory footprint.
