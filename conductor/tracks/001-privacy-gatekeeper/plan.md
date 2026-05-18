# Implementation Plan: PrivacyGatekeeper Classifier

## Phase 1: Data Synthesis & Edge Model Training

### 1. Ingestion Package Development (`@alete/gate-ingest`)
Establish the single source of truth for data processing.
- [ ] Scaffold `packages/gate-ingest` with TypeScript support.
- [ ] Centralize `@mdream/js` `tagOverrides` to retain structural HTML (Forms, Inputs, Nav).
- [ ] Implement the `TokenMapper` to convert Markdown/HTML artifacts into alphanumeric tokens (e.g., `STRUCT_FORM_START`).
- [ ] Export a `process(html: string): string` function for both Node.js (synthesis) and Browser (extension) contexts.

### 2. Data Sourcing Strategy (Raw HTML Acquisition)
- [ ] **Cyber Security Datasets:** Extract raw HTML of financial/medical portals from phishing datasets (WebPhish, PhishLang).
- [ ] **Structural Web Datasets:** Utilize WebSRC or WebCode2M for layout diversity.
- [ ] **Targeted Automated Scrape:** Build a custom scraping script with hydration delays to capture Substack/News vs. Banking/Health HTML.

### 3. Training Data Compilation
- [ ] Update `scripts/synthesize.js` to use `@alete/gate-ingest`.
- [ ] Generate `data/processed/training_set.json` (Text + Label).
- [ ] Convert JSON to `data/processed/training_set.csv` for Create ML ingestion.

### 4. Native Model Training (Create ML)
- [ ] Open Xcode -> Developer Tools -> Create ML.
- [ ] Train on the token-mapped CSV using the Maximum Entropy algorithm.
- [ ] Validate for High Recall on `sensitive_portal`.
- [ ] Export and store `models/PrivacyGatekeeper.mlpackage` in the repository.

## Phase 2: Integration & Verification
- [ ] Create a test harness to verify the `.mlpackage` on unseen HTML samples.
- [ ] Benchmark latency (Goal: < 50ms) and memory footprint.
