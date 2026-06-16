# Plan: Cognitive Mode Edge Classifier Retraining

## Phase 1: Test & Validation Script Preparation (TDD Phase)

- [ ] Task: Prep Validation Tests
  - [ ] Add unit tests in `scripts/compile_datasets.test.ts` checking that the output labels in training/test compilations strictly belong to the set `['deep_work', 'informational', 'communication', 'noise']`.
  - [ ] Write unit tests to verify that the compiled training dataset class distribution is balanced (ratio of largest to smallest class is < 2.0, targeting 150–200 per class).
  - [ ] Write a test verifying that `staging_test_set.json` holds exactly a 20% stratified partition of the staging data and does not leak into the training inputs.
  - [ ] Write a script dry-run validation in `scripts/retrain_pipeline.test.ts` ensuring that labeling results mapped to legacy labels trigger validation errors.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Validation Prep' (Protocol in workflow.md)

## Phase 2: Gemini Pro Labeling & Stratified Scrubbing Updates

- [ ] Task: Refactor Gemini Pro Auto-Labeler Prompt
  - [ ] Update `MODEL_ID` in `scripts/label_extractions.ts` to `'gemini-2.5-pro'`.
  - [ ] Modify the prompt definition in `scripts/label_extractions.ts` to outline the 4 cognitive modes: `deep_work`, `informational`, `communication`, and `noise`.
  - [ ] Provide clear few-shot examples for `deep_work` (code edits, IDE) and `communication` (chat apps, mail) pages.
  - [ ] Implement label validation to catch and retry on any response not matching the 4-class taxonomy.
- [ ] Task: Update Scrubbing, Balancing, & Compilation
  - [ ] Modify `scripts/anonymize_staging_data.ts` to strip usernames, project IDs, and emails.
  - [ ] Modify `scripts/compile_datasets.ts` to perform a stratified 80/20 train/test split.
  - [ ] Implement class balancing in `scripts/compile_datasets.ts` (downsample overrepresented categories using deterministic content hashing; apply regex/keyword heuristic boosters for underrepresented ones).
  - [ ] Ensure that raw datasets (`raw_staging_extractions.json`, `raw_staging_labeled.json`) and test-sets (`staging_test_set.json`) remain properly git-ignored.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Labeler & Compilation Updates' (Protocol in workflow.md)

## Phase 3: Create ML Training & Swift Verification Updates

- [ ] Task: Modify train_model.swift & verify_model.swift
  - [ ] Refactor Swift files under `scripts/` to train and verify the model with the 4 target classes.
  - [ ] Update the verification output reporter to display precision, recall, and F1 metrics for each of the 4 modes individually.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Swift Code Updates' (Protocol in workflow.md)

## Phase 4: Pipeline Execution & Weights Export

- [ ] Task: Execute Pipeline & Audit Accuracy
  - [ ] Run `pnpm run db:retrain-pipeline` to verify the entire pipeline runs without error.
  - [ ] Review performance matrix report and confirm validation accuracy exceeds 92% overall and 90% individually for each class.
  - [ ] Verify `PrivacyGatekeeper.mlmodel` is generated in `models/`.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Retraining Execution' (Protocol in workflow.md)

