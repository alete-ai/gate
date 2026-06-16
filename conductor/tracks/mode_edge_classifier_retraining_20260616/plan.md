# Plan: Cognitive Mode Edge Classifier Retraining

## Phase 1: Test & Validation Script Preparation (TDD Phase)

- [ ] Task: Prep Validation Tests
  - [ ] Add unit tests in `scripts/compile_datasets.test.ts` checking that the output labels in training/test compilations strictly belong to the set `['deep_work', 'informational', 'communication', 'noise']`.
  - [ ] Write a script dry-run validation in `scripts/retrain_pipeline.test.ts` ensuring that labeling results mapped to legacy labels trigger validation errors.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Validation Prep' (Protocol in workflow.md)

## Phase 2: Gemini Labeling & Scrubbing Updates

- [ ] Task: Refactor Gemini Auto-Labeler Prompt
  - [ ] Modify the prompt definition in `scripts/label_extractions.ts` to outline the 4 cognitive modes.
  - [ ] Provide clear few-shot examples for `deep_work` and `communication` pages.
- [ ] Task: Update Scrubbing & Compilation
  - [ ] Modify `scripts/compile_datasets.ts` to handle formatting, balancing, and splitting of the 4-class dataset.
  - [ ] Ensure that raw datasets and test-sets remain properly git-ignored.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Labeler & Compilation Updates' (Protocol in workflow.md)

## Phase 3: Create ML Training & Swift Verification Updates

- [ ] Task: Modify train_model.swift & verify_model.swift
  - [ ] Refactor Swift files under `scripts/` to train and verify the model with the 4 target classes.
  - [ ] Update the verification output reporter to display precision, recall, and F1 metrics for each of the 4 modes individually.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Swift Code Updates' (Protocol in workflow.md)

## Phase 4: Pipeline Execution & Weights Export

- [ ] Task: Execute Pipeline & Audit Accuracy
  - [ ] Run `pnpm run db:retrain-pipeline` to verify the entire pipeline runs without error.
  - [ ] Review performance matrix report and confirm validation accuracy exceeds 90%.
  - [ ] Verify `PrivacyGatekeeper.mlmodel` is generated in `models/`.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Retraining Execution' (Protocol in workflow.md)
