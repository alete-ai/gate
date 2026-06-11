# Implementation Plan: Transfer Learning Classifier Upgrade (v1.0.0)

## Phase 1: Prototype & Swift Parameter Configuration

### 1. Parameter Injection & SDK Configuration
- [ ] Configure `scripts/train_model.swift` to support custom `MLTextClassifier.ModelParameters`.
- [ ] Initialize `MLTextClassifier.ModelParameters` with `.transferLearning(.dynamicEmbedding, revision: 1)`.
- [ ] Set `language: .english` and default automatic validation split.
- [ ] Set the model metadata version parameter to `"1.0.0"`.

### 2. Sandbox Retraining Execution
- [ ] Run `swift scripts/train_model.swift` locally on the 567 combined staging & core training records.
- [ ] Verify that `PrivacyGatekeeper.mlmodel` is successfully outputted to `models/`.
- [ ] Record the trained model file size and compare it to the v0.3.3 Maximum Entropy model (711 KB).

- [ ] Task: Conductor - User Manual Verification 'Phase 1: Prototype & Swift Parameter Configuration' (Protocol in workflow.md)

## Phase 2: Verification, Comparative Analytics & Release

### 3. Verification & Metrics Capture
- [ ] Run `swift scripts/verify_model.swift` to evaluate the new model against the 111-record staging holdout test set.
- [ ] Record transfer learning accuracy, false negatives (leaks), and false positives (blocks).
- [ ] Verify that average inference latency is still optimal (< 5.0 ms).

### 4. Version Bump & SPM Manifest Check
- [ ] Bump version to `1.0.0` in `package.json` and `packages/gate-ingest/package.json`.
- [ ] Run `pnpm run build && pnpm run test` to verify build and test integrity.
- [ ] Ensure that no local staging data files or raw labels are included in the staged git changeset.

- [ ] Task: Conductor - User Manual Verification 'Phase 2: Verification, Comparative Analytics & Release' (Protocol in workflow.md)
