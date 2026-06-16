# Specification: Cognitive Mode Edge Classifier Retraining

## 1. Overview

To support the client-side evolution of local cognitive mode tracking, we must retrain the local MaxEnt/Apple Native text classifier model (`PrivacyGatekeeper.mlmodel`). The model must shift from the legacy 3-class target space (`sensitive_portal`, `digestible_article`, `noise`) to the new 4-class target space:

- `deep_work`: Focus environment pages (coding, document creation/edit, design, writing).
- `informational`: Knowledge/reading pages (documentation, tutorials, news, books).
- `communication`: Interaction pages (Slack, Discord, emails, DMs).
- `noise`: Low-attention/distractor pages (infinite scrolls, retail shopping, landing pages).

We will utilize the existing retraining orchestrator pipeline CLI (`scripts/retrain_pipeline.ts`) but modify the individual steps to handle labeling, anonymization, compilation, training, and verification for the new target spaces.

---

## 2. Objectives

1.  **Gemini Auto-Labeling Update:** Refactor `scripts/label_extractions.ts` to query Gemini 3.5 Flash using a prompt tailored for the 4 cognitive modes.
2.  **Dataset Compilation Expansion:** Modify `scripts/compile_datasets.ts` and `scripts/anonymize_staging_data.ts` to handle, validate, and compile datasets mapped to the new classes.
3.  **Swift Model Training Upgrade:** Adapt `scripts/train_model.swift` to train the Apple MaxEnt text classifier with the updated 4-class taxonomy.
4.  **Verification & Metrics Verification:** Refactor `scripts/verify_model.swift` to output evaluation matrices (precision, recall, F1, accuracy) across the 4 classes, ensuring validation accuracy is maintained above 90% before exporting the model weights.

---

## 3. Technical Requirements

### A. Gemini Labeling Refactor

- File: `scripts/label_extractions.ts`
- **System Prompt Update:**
  - Define the 4 cognitive modes:
    - `deep_work`: Page context represents creation/editing/authoring (e.g. GitHub pull request files, Google Doc editing, coding workspaces, local IDE hosts).
    - `informational`: Page context represents research or reading (e.g. StackOverflow answers, language documentation, technical blogs, Wikipedia articles).
    - `communication`: Page context represents collaboration (e.g. Slack web channels, Microsoft Teams chat, Gmail composer or inbox).
    - `noise`: Page context represents non-productive distractions (e.g. Twitter feed, YouTube recommendations, retail e-commerce).
  - Constrain the output JSON to only emit these 4 values.

### B. Compilation & PII Scrubbing

- File: `scripts/anonymize_staging_data.ts` and `scripts/compile_datasets.ts`
- Verify dataset balancing. Ensure each class has sufficient representation (targeting at least 150-200 samples per class).
- Enforce strict PII scrubbing: strip all emails, personal names, and API keys.

### C. Create ML Training & Verification

- File: `scripts/train_model.swift` and `scripts/verify_model.swift`
- Verify compatibility of MaxEnt text classifier features with the new labels.
- Calculate class-specific precision and recall. If recall for `deep_work` or `communication` is low (due to high overlap with other classes), add custom heuristic keyword boosters during dataset compilation.
- Export the finalized model to `models/PrivacyGatekeeper.mlmodel`.

---

## 4. Out of Scope

- Client-side extension scraper changes (handled by the `vedai` client track).
- Modifying the NestJS or Mongoose database structures (already set up).
