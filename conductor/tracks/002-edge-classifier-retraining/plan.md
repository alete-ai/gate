# Implementation Plan: Edge Classifier Retraining

## Phase 1: Data Acquisition, Isolation & LLM Labeling

### 1. Data Isolation Setup
Ensure that raw user browsing data is never pushed to the public git repository.
- [ ] Add `data/raw_staging_*.json` and `data/staging_test_set.json` to `.gitignore`.
- [ ] Verify that running `git status` shows staging files as untracked and excluded.

### 2. Database Connection & Pull Script
Establish the pipeline to extract raw staging extractions from the MongoDB staging cluster.
- [ ] Create script `scripts/pull_staging_extractions.ts` to connect to `vedai-cluster-staging.952n7om.mongodb.net`.
- [ ] Resolve credentials from `apps/analysis-service/.env.staging` in the `vedai` workspace.
- [ ] Fetch all records from `raw_staging_extractions` collection and log total records fetched.
- [ ] Save the fetched records locally to `data/raw_staging_extractions.json` (ensure it is git-ignored).

### 3. Gemini 3.5 Flash High Labeling Pipeline
Label the fetched staging data using Gemini 3.5 Flash High to establish ground truth.
- [ ] Integrate Vertex AI / Google Gen AI SDK into `scripts/pull_staging_extractions.ts`.
- [ ] Formulate prompt instructing the LLM to classify content into `sensitive_portal`, `digestible_article`, or `noise`.
- [ ] Execute sequential or batch calls to label each raw extractions record.
- [ ] Save output labeled data to `data/raw_staging_labeled.json` (ensure it is git-ignored).

### 4. PII Auditing & Anonymization Script
Create a utility to scan and sanitize all personal data from the training candidate set.
- [ ] Create script `scripts/anonymize_staging_data.ts` using regular expressions and keywords to detect names, emails, authentication headers, cookies, API keys, and private URLs.
- [ ] Anonymize and redact the text content, preserving structural layout tokens (e.g. `structFormStart`) needed for training.
- [ ] Export the scrubbed data to `data/raw_staging_anonymized.json`.

- [ ] Task: Conductor - User Manual Verification 'Phase 1: Data Acquisition, Isolation & LLM Labeling' (Protocol in workflow.md)

## Phase 2: Curation, Training, and Verification

### 5. Curation & Dataset Compilation
Split the labeled dataset and merge the training split into the core training files.
- [ ] Create script `scripts/compile_datasets.ts` to process `data/raw_staging_anonymized.json`.
- [ ] Randomly split data: 20% into `data/staging_test_set.json` (dedicated test set, git-ignored) and 80% to be merged.
- [ ] Merge the 80% split with `data/processed/training_set.json`.
- [ ] Re-compile `data/processed/training_set.csv` for Create ML training.

### 6. Create ML Retraining & Evaluation
Train the Maximum Entropy model and evaluate accuracy on the validation and staging test sets.
- [ ] Execute Create ML training via `scripts/train_model.swift`.
- [ ] Update `scripts/verify_model.swift` to evaluate against both the standard validation set and the new `data/staging_test_set.json`.
- [ ] Run `scripts/verify_model.swift` and log accuracy, latency, and false positive/negative statistics.
- [ ] Verify if over-sensitivity has been reduced while maintaining 100% recall on sensitive portals.

- [ ] Task: Conductor - User Manual Verification 'Phase 2: Curation, Training, and Verification' (Protocol in workflow.md)

## Phase 3: Versioning, Publishing, and Integration

### 7. Package Version Increment & Release
Prepare and deploy the updated packages.
- [ ] Increment the version (patch bump) in `package.json` and package-lock files.
- [ ] Update version in `AleteGateKit` SPM manifest and script metadata.
- [ ] Run build pipeline to rebuild Typescript dual Node/Browser bundles.
- [ ] Run `scripts/build_xcframework.sh` to generate the native Swift framework.
- [ ] Publish the npm package and tag the Swift release.

### 8. Vedai Project Integration & Hit Rate Test
Verify the updated edge classifier in the downstream `vedai` workspace.
- [ ] Navigate to `/Users/stoyan/git/vedai/worktrees/chore/edge_retrain`.
- [ ] Update the `@alete-ai/gate-ingest` dependency to the newly published version.
- [ ] Run local integration tests or verification scripts in `vedai` using staging DB data to verify hit rate improvement.

- [ ] Task: Conductor - User Manual Verification 'Phase 3: Versioning, Publishing, and Integration' (Protocol in workflow.md)
