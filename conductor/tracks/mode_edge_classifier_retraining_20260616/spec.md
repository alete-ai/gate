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

1.  **Google Gemini Pro Auto-Labeling:** Update `scripts/label_extractions.ts` to utilize Google's most capable model available in Vertex AI for reasoning and classification: **Gemini 2.5 Pro** (using `gemini-2.5-pro` model identifier), ensuring the highest label quality for complex developer contexts.
2.  **PII Scrubbing & Anonymization:** Implement strict scrubbing in `scripts/anonymize_staging_data.ts` to strip personal emails, usernames, tokens, and API credentials from the extractions.
3.  **Dataset Balancing & Overfitting Prevention:** Modify `scripts/compile_datasets.ts` to enforce a balanced sample count across all 4 target classes:
    - Target at least 150-200 samples per class in the training dataset.
    - Prevent overfitting by downsampling overrepresented classes (e.g. `informational` or `noise`) using deterministic content hashing.
    - Boost underrepresented classes (e.g. `communication` or `deep_work`) using heuristic regex boosters or custom few-shot templates.
4.  **Holdout Test Set Retention:** Pull all raw staging extractions from the staging database. Deterministically split the dataset:
    - **20% Holdout Test Set:** Save as `data/staging_test_set.json` (git-ignored). This set must be stratified (proportional class distribution) and never used during model training to avoid validation leakage.
    - **80% Training Set:** Merged with the core training dataset to create the flat training input.
5.  **Swift Model Training & Verification:** Upgrade `scripts/train_model.swift` and `scripts/verify_model.swift` to train and evaluate the Apple MaxEnt text classifier, exporting individual precision/recall/F1 metrics for all 4 classes.

---

## 3. Technical Requirements

### A. Gemini Pro Labeling
- **File:** `scripts/label_extractions.ts`
- **Model ID:** Update `MODEL_ID` to `'gemini-2.5-pro'` (or latest stable Vertex Pro model equivalent).
- **Prompt definition:** Define clear criteria and few-shot examples for the 4 cognitive classes:
  - `deep_work`: Pages representing authoring, editing, coding, or modeling (e.g., GitHub pull request files, Google Doc editing, Jupyter notebooks, local IDEs).
  - `informational`: Pages representing research, reading, or learning (e.g., StackOverflow questions/answers, library documentation, news articles, Wikipedia).
  - `communication`: Pages representing team collaboration or messaging (e.g., Slack channels, Microsoft Teams, Discord, emails, DMs).
  - `noise`: Pages representing distractions or transactional landing pages (e.g., Twitter feeds, YouTube, e-commerce, empty loading screens).
- **Output Constraint:** Constrain the LLM's response to only return one of the 4 label strings. Add automatic verification to retry on invalid label outputs.

### B. Dataset Balancing & Partitioning
- **File:** `scripts/compile_datasets.ts`
- **Stratified Split:** Implement an 80/20 train/test split on the pulled staging records.
- **Class Balancing:**
  - Cap class size at a maximum of 250 samples to prevent single-class dominance.
  - Implement heuristic boosting for sparse classes (e.g. injecting samples matching Slack/Discord domains or GitHub/docs keywords).

### C. Create ML Training & Verification
- **Files:** `scripts/train_model.swift` and `scripts/verify_model.swift`
- **Classification Taxonomy:** Train the Apple MaxEnt text classifier with the updated 4 classes.
- **Evaluation:** Report precision, recall, and F1 metrics for each class. Overall accuracy must exceed 90%.

---

## 4. Out of Scope

- Client-side extension scraper changes (handled by the client track).
- Modifying the NestJS or Mongoose database structures.

