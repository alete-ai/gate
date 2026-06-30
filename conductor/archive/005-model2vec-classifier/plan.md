# Plan: Model2Vec INT4 Classifier

## Phase 1: Research, Tokenizer and Training Setup

- [x] Task: Set Up Python Distillation Pipeline
  - [x] Research Model2Vec training APIs and package requirements.
  - [x] Create `scripts/train_model2vec.py` using Python `model2vec[distill,train]` package.
  - [x] Distill a base static model (e.g. `minishlab/potion-base-8M` or a custom distillation) on `data/processed/training_set_flat.json` and train classification weights for the 4 target classes.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Setup & Python Training Pipeline' (Protocol in workflow.md)

## Phase 2: Core ML Conversion & 4-bit Quantization

- [x] Task: PyTorch to Core ML Conversion
  - [x] Implement a PyTorch module `Model2VecClassifier` representing token embedding lookup, mean-pooling, and linear projection.
  - [x] Write `scripts/convert_model2vec.py` to import PyTorch weights, convert the module to Core ML (`.mlpackage`) using `coremltools`.
- [x] Task: Apply 4-bit Quantization
  - [x] Configure `coremltools.optimize` to compress model weights to INT4 precision.
  - [x] Verify that `models/Model2VecGatekeeper.mlmodel` is successfully generated and its size is under 5MB (Achieved **3.7 MB**).
- [x] Task: Conductor - User Manual Verification 'Phase 2: Core ML & Quantization Pipeline' (Protocol in workflow.md)

## Phase 3: Swift Integration & Verification

- [x] Task: Swift Tokenizer Setup
  - [x] Add `swift-transformers` package dependency in `ios/AleteGateKit/Package.swift`.
  - [x] Add a Swift wrapper to perform tokenization using Model2Vec's distilled subword vocabulary.
- [x] Task: Comparative Benchmarking
  - [x] Update `scripts/verify_model.swift` to support loading the new Model2Vec classifier.
  - [x] Run comparative validation on the staging holdout dataset.
  - [x] Generate a final benchmarking report comparing MaxEnt, NLContextualEmbedding, and Model2Vec INT4 on accuracy, size, and P50/P90/P99 latencies.
- [x] Task: SPM Package Validation
  - [x] Verify the SPM package builds and passes tests using `swift test`.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Integration and Comparative Benchmarking' (Protocol in workflow.md)
