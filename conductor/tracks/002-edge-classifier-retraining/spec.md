# Specification: Edge Classifier Retraining

## Overview
The **PrivacyGatekeeper** classifier is currently overly sensitive, leading to high false-positive rates where digestible narrative articles are blocked as sensitive portals. To resolve this, we will retrieve real-world data pre-processed in Markdown from our staging database (`raw_staging_extractions` collection in the MongoDB staging cluster), label it using Gemini 3.5 Flash High as the ground truth, and incorporate it into our training pipeline. A subset of this staging data will be held out as a dedicated "real test set" to verify performance improvements before updating and redeploying the library.

## Objectives
1. **Pull Production Data:** Connect to the `vedai` staging MongoDB cluster and pull all raw staging extractions (~100 records).
2. **LLM Ground Truth Labeling:** Use Gemini 3.5 Flash (High) to analyze each extraction and assign a high-fidelity label (`sensitive_portal`, `digestible_article`, or `noise`).
3. **Data Splitting & Curation:** Hold back 20% of the staging data as a dedicated real-world test set. Append the remaining 80% to the training set.
4. **Retrain Classifier:** Run the Create ML training pipeline to compile a new `.mlmodel` substrate.
5. **Verify Performance:** Run verification on the general validation set and the new staging test set.
6. **Increment & Redeploy:** Bump the library version, build bundles, and publish.
7. **Downstream Integration:** Update the `@alete-ai/gate-ingest` dependency in the `vedai` workspace and verify the improved classification hit rate.

## Architectural Blueprint
```mermaid
flowchart TD
    A[Staging MongoDB Cluster] -->|Pull Extractions| B[pull_and_label_staging.ts]
    B -->|Query Labels| C[Gemini 3.5 Flash High]
    C -->|Ground Truth Labels| B
    B -->|Save Labeled Data| D[raw_staging_labeled.json]
    D -->|80% split| E[Training Set Compilation]
    D -->|20% split| F[staging_test_set.json]
    E -->|training_set.csv| G[Create ML Training]
    G -->|New mlmodel| H[verify_model.swift]
    F -->|Evaluate| H
    H -->|Validate Parity & Recall| I[Version Bump & Redeploy]
    I -->|Import & Test| J[vedai Project]
```

## Functional Requirements
- **Database Connector:** Establish a connection to `vedai-cluster-staging.952n7om.mongodb.net/vedai_db` using credentials from `.env.staging` in the `vedai` workspace.
- **LLM Ground Truth Labeler:** Call the Vertex AI / Gemini API to classify content (title + structural markdown + semantic markdown) using Gemini 3.5 Flash High.
- **Data Curation & Compilation:** Write a curation script to combine existing training data with the new staging data (80% training / 20% testing split).
- **Model Training:** Retrain `PrivacyGatekeeper` using Create ML's Maximum Entropy algorithm.
- **Verification Harness:** Evaluate performance metrics:
  - Accuracy & Average Latency (Target: Accuracy >97%, Latency <1ms).
  - Survival Recall on `sensitive_portal` (Target: 100.00% recall).
  - digestible_article Recall (Target: minimize false positives).
- **Versioning & Release:** Bump package version in `package.json` and Swift Package manifest, and publish.

## Non-Functional Requirements
- **Sub-Megabyte Footprint:** The compiled `.mlmodel` must remain under 1MB.
- **Privacy Preservation:** No PII or raw staging credentials should be committed to version control.
