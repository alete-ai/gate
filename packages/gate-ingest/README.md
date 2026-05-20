# @alete/gate-ingest 🛡️

Unified ingestion and token-mapping pipeline for the Alete PrivacyGatekeeper.

**@alete/gate-ingest** is the core TypeScript/JavaScript substrate of the Alete Gate system. It provides high-fidelity HTML purification, structural tokenization, and semantic Markdown extraction.

## 🚀 Key Features

- **Structural Substrate Extraction**: Purifies HTML into high-signal structural tokens for edge classification.
- **Semantic Metadata extraction**: Extracts titles and descriptions even from fragmented or non-standard HTML.
- **Universal Compatibility**: Optimized for Browser Extensions (Safari/Chrome), Node.js, and Mobile WebViews.
- **Zero-Config Loading**: Resilient asset resolution across all platforms.

## 📦 Installation

```bash
pnpm add @alete/gate-ingest
# or
npm install @alete/gate-ingest
```

## ⚡ Usage

```typescript
import { processHtml } from '@alete-ai/gate-ingest';

/**
 * Capture and Purify
 */
async function capturePage() {
  const html = document.documentElement.outerHTML;

  const { 
    structural, 
    semantic 
  } = await processHtml(html);

  return semantic; // Clean Markdown for further processing
}
```

### Advanced Options

```typescript
const result = await processHtml(html, {
  semanticTokenCap: 20000 // Limit semantic tokens for analysis latency
});
```


## 📊 Performance Telemetry

When paired with the **PrivacyGatekeeper** native classifier, the ingestion substrate demonstrates the following metrics:

| Metric | Result | Note |
| :--- | :--- | :--- |
| **Total Accuracy** | **97.60%** | Combined ingestion + classification score |
| **Avg. Latency** | **0.48 ms** | Benchmark on Apple Silicon substrate |
| **Survival Recall** | **100.00%** | Zero leaks of sensitive portals to digestible articles |
| **Article Recall** | **100.00%** | Perfect fidelity for content extraction |

## 🛡️ Privacy & Strategy

Alete Gate prioritizes **Cognitive Sovereignty**. By performing ingestion and classification locally, we ensure that the user's "Informational Diet" remains private and that sensitive transactional data never enters the analysis pipeline.

## 📄 License
AGPL-3.0 - Copyright (c) 2026 [Alete Inc.](https://alete.ai/)
