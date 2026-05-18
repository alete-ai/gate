# Specification: PrivacyGatekeeper Classifier

## Overview
The **PrivacyGatekeeper** is an Apple native text classifier (`.mlpackage`) serving as the first phase ("The Gate") of a privacy-first "Informational Diet Tracker". It acts as an edge-based circuit breaker: it identifies and blocks highly sensitive transactional data portals (banking, healthcare) locally on iOS, allowing only digestible narrative articles to pass through for further NLP analysis.

## Core Architectural Blueprint
- **Ingestion Interface (`@alete/gate-ingest`):** A unified Node.js/TypeScript package that encapsulates the `@mdream/js` extraction logic and the Token Mapping pipeline. It provides two distinct outputs:
  - **Structural Tokens:** Alphanumeric tokens (e.g., `STRUCT_FORM_START`) for the edge classifier.
  - **Semantic Markdown:** Clean, readable Markdown for LLM (Gemini) analysis.
- **Extraction (Edge Browser):** Execute `@alete/gate-ingest` via iOS WKWebView or Safari Web Extension.
- **Privacy Gatekeeper (iOS Edge):** Pass the **Structural Tokens** through a native Apple NLModel (Maximum Entropy classifier).
- **Semantic Analysis (Cloud/LLM):** Pass the **Semantic Markdown** to Gemini for narrative topic and diversity analysis *only if* the Gatekeeper allows it.
- **Local NLP (iOS Edge):** Subsequent NLTagger analysis on non-sensitive text.

## Engineering Risk Assessment & Mitigations

### 🔴 Risk 1: The NLP Tokenization Trap (Critical)
**The Flaw:** Apple's Maximum Entropy classifier uses `NLTokenizer`, which strips punctuation. 
**The Fix (Token Mapping):** Structural symbols are mapped to explicit alphanumeric tokens (e.g., `STRUCT_FORM_START`) within the `@alete/gate-ingest` pipeline.

### 🔴 Risk 2: The mdream Aggression Paradox
**The Flaw:** Default `mdream` configuration strips forms and widgets.
**The Fix (Custom Overrides):** `@alete/gate-ingest` provides a custom configuration that forces the retention of structural markers like `<form>`, `<input>`, and deep `<a>` link clusters.

### 🔴 Risk 3: SPA Hydration Empty States
**The Flaw:** Capturing HTML before hydration leads to empty `div`s.
**The Fix (Hydration Delay):** Injected scripts must wait for `document.readyState === 'complete'` and use `MutationObserver` to confirm the presence of structural elements before extraction.

## Objectives
- **Sub-Megabyte Footprint:** Maximum Entropy model utilizing structural tokens.
- **High Recall for Sensitive Portals:** False Positives are acceptable; False Negatives are catastrophic.
- **Unified Logic:** `@alete/gate-ingest` is the single source of truth for text processing.

## Deliverables
1.  **`@alete/gate-ingest` NPM Package:** Contains the configuration and token mapper.
2.  **Training Data JSON/CSV:** The processed, token-mapped dataset stored in `data/processed`.
3.  **`PrivacyGatekeeper.mlpackage`:** The final compiled Apple native model stored in the repository.

## Labels
- `sensitive_portal`: Login screens, payment gateways, healthcare dashboards.
- `digestible_article`: News, Substack, long-form narrative content.
- `noise`: Marketing landing pages, generic non-narrative content.
