# Implementation Plan: Edge Classifier Retraining CLI Action

## Phase 1: Local-to-Staging Integration & Options

### 1. Database Configuration & Credentials Resolution
Ensure the orchestrator script resolves local and staging credentials correctly.
- [x] Connect to local MongoDB instance (`vedai_db`) using default development URI or environment configurations.
- [x] Connect to staging MongoDB cluster using configurations parsed from `apps/analysis-service/.env.staging` in the `vedai` workspace.

### 2. Local-to-Staging Push Logic
Integrate the ability to sync and clear local raw extractions.
- [x] Add the push logic inside the orchestrator script to read local `raw_staging_extractions` collection, upsert them to staging MongoDB cluster (based on hash/URL), and delete them locally on successful sync.
- [x] Provide a `--skip-push` flag to bypass this stage if the developer only wants to retrain from existing staging data.

- [x] Task: Conductor - User Manual Verification 'Phase 1: Local-to-Staging Integration & Options' (Protocol in workflow.md)

## Phase 2: Pipeline Orchestration & Curation

### 3. Orchestration Script Setup
Create the main script to run all pipeline steps in sequence.
- [x] Create `scripts/retrain_pipeline.ts` as the entry point of the CLI action.
- [x] Add support for CLI options: `--skip-push`, `--skip-labeling`, `--dry-run`, and `--silent`.
- [x] Implement stage execution tracing and fail-fast handling: if any sub-script fails (exits non-zero), abort the pipeline immediately.

### 4. Data Extraction & Labeling Stage
Fetch and label raw staging records.
- [x] Trigger pulling extractions from staging MongoDB cluster and save output to `data/raw_staging_extractions.json`.
- [x] If `--skip-labeling` is not set (and labeled file does not exist), invoke the Vertex AI / Gemini API labeling script to tag all pulled records with ground truth, saving to `data/raw_staging_labeled.json`.

### 5. Anonymization & Dataset Compilation Stage
Sanitize personal data and compile the final dataset split.
- [x] Invoke anonymization script to redact PII and save to `data/raw_staging_anonymized.json`.
- [x] Invoke compilation script to partition 20% of the new staging dataset into `data/staging_test_set.json` (git-ignored) and merge the remaining 80% training split into `data/processed/training_set.json`.
- [x] Recompile `data/processed/training_set_flat.json` and `data/processed/training_set_flat.csv` for Create ML.

- [x] Task: Conductor - User Manual Verification 'Phase 2: Pipeline Orchestration & Curation' (Protocol in workflow.md)

## Phase 3: Model Retraining & Verification

### 6. Create ML Retraining Stage
Retrain the classifier using the unified dataset.
- [x] Invoke `scripts/train_model.swift` using `swift` runner.
- [x] Verify that the new model `PrivacyGatekeeper.mlmodel` is successfully written to `models/` directory.

### 7. Evaluation & Report Stage
Evaluate model performance against holdout test sets and print clean metrics.
- [x] Invoke `scripts/verify_model.swift` to evaluate accuracy on both the core validation set and the new `data/staging_test_set.json`.
- [x] Display an aesthetic final report showing:
  - Total Training Records used.
  - General Validation Set Accuracy (target: >97%).
  - Staging Test Set Accuracy (and false-positive/negative statistics).
  - Average inference latency.

### 8. CLI Command Registration
Register the action in `package.json`.
- [x] Add `"db:retrain-pipeline": "tsx scripts/retrain_pipeline.ts"` to `package.json` in the `gate` workspace.

- [x] Task: Conductor - User Manual Verification 'Phase 3: Model Retraining & Verification' (Protocol in workflow.md)
