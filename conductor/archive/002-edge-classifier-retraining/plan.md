# Implementation Plan: Edge Classifier Retraining

## Phase 1: Data Acquisition, Isolation & LLM Labeling

### 1. Data Isolation Setup
Ensure that raw user browsing data is never pushed to the public git repository.
- [x] Add `data/raw_staging_*.json` and `data/staging_test_set.json` to `.gitignore`.
- [x] Verify that running `git status` shows staging files as untracked and excluded.

### 2. Database Connection & Pull Script
Establish the pipeline to extract raw staging extractions from the MongoDB staging cluster.
- [x] Create script `scripts/pull_staging_extractions.ts` to connect to `vedai-cluster-staging.952n7om.mongodb.net`.
- [x] Resolve credentials from `apps/analysis-service/.env.staging` in the `vedai` workspace.
- [x] Fetch all records from `raw_staging_extractions` collection and log total records fetched.
- [x] Save the fetched records locally to `data/raw_staging_extractions.json` (ensure it is git-ignored).

### 3. Gemini 3.5 Flash High Labeling Pipeline
Label the fetched staging data using Gemini 3.5 Flash High to establish ground truth.
- [x] Create script `scripts/label_extractions.ts` utilizing Vertex AI / Google Gen AI SDK.
- [x] Formulate prompt instructing the LLM to classify content into `sensitive_portal`, `digestible_article`, or `noise`.
- [x] Execute sequential or batch calls to label each raw extractions record.
- [x] Save output labeled data to `data/raw_staging_labeled.json` (ensure it is git-ignored).

### 4. PII Auditing & Anonymization Script
Create a utility to scan and sanitize all personal data from the training candidate set.
- [x] Create script `scripts/anonymize_staging_data.ts` using regular expressions and keywords to detect names, emails, authentication headers, cookies, API keys, and private URLs.
- [x] Anonymize and redact the text content, preserving structural layout tokens (e.g. `structFormStart`) needed for training.
- [x] Export the scrubbed data to `data/raw_staging_anonymized.json`.

- [x] Task: Conductor - User Manual Verification 'Phase 1: Data Acquisition, Isolation & LLM Labeling' (Protocol in workflow.md)

## Phase 2: Curation, Training, and Verification

### 5. Curation & Dataset Compilation
Split the labeled dataset and merge the training split into the core training files.
- [x] Create script `scripts/compile_datasets.ts` to process `data/raw_staging_anonymized.json`.
- [x] Randomly split data: 20% into `data/staging_test_set.json` (dedicated test set, git-ignored) and 80% to be merged.
- [x] Merge the 80% split with `data/processed/training_set.json`.
- [x] Re-compile `data/processed/training_set.csv` for Create ML training.

### 6. Create ML Retraining & Evaluation
Train the Maximum Entropy model and evaluate accuracy on the validation and staging test sets.
- [x] Execute Create ML training via `scripts/train_model.swift`.
- [x] Update `scripts/verify_model.swift` to evaluate against both the standard validation set and the new `data/staging_test_set.json`.
- [x] Run `scripts/verify_model.swift` and log accuracy, latency, and false positive/negative statistics.
- [x] Verify if over-sensitivity has been reduced while maintaining 100% recall on sensitive portals.

- [x] Task: Conductor - User Manual Verification 'Phase 2: Curation, Training, and Verification' (Protocol in workflow.md)

## Phase 3: Versioning, Publishing, and Integration

### 7. Package Version Increment & Release
Prepare and deploy the updated packages.
- [x] Increment the version (patch bump) in `package.json` and package-lock files.
- [x] Update version in `AleteGateKit` SPM manifest and script metadata.
- [x] Run build pipeline to rebuild Typescript dual Node/Browser bundles.
- [x] Run `scripts/build_xcframework.sh` to generate the native Swift framework.
- [x] Publish the npm package and tag the Swift release (locally verified and prepared).

### 8. Vedai Project Integration & Hit Rate Test
Verify the updated edge classifier in the downstream `vedai` workspace.
- [x] Navigate to `/Users/stoyan/git/vedai/worktrees/chore/edge_retrain`.
- [x] Update the `@alete-ai/gate-ingest` dependency to the newly published version.
- [x] Run local integration tests or verification scripts in `vedai` using staging DB data to verify hit rate improvement.

- [x] Task: Conductor - User Manual Verification 'Phase 3: Versioning, Publishing, and Integration' (Protocol in workflow.md)

