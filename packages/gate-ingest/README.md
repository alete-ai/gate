# @alete/gate-ingest 🛡️

Unified ingestion and token-mapping pipeline for the Alete PrivacyGatekeeper.

**@alete/gate-ingest** is the core TypeScript/JavaScript substrate of the Alete Gate system. It provides high-fidelity HTML purification, structural tokenization, and PII-shielded semantic Markdown extraction.

## 🚀 Key Features

- **Structural Substrate Extraction**: Purifies HTML into high-signal structural tokens for edge classification.
- **Narrative-First Redaction**: Shields "Toxic IDs" (SSNs, Credit Cards, Emails) while preserving the narrative flow of articles.
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
import { processHtml } from '@alete/gate-ingest';

/**
 * Capture, Purify, and Shield
 * This ensures that no sensitive banking or health data 
 * leaves the device by redacting PII locally.
 */
async function shieldCurrentPage() {
  const html = document.documentElement.outerHTML;
  
  const { 
    structural, 
    semantic, 
    hasSensitiveInfo 
  } = await processHtml(html, { 
    redact: true 
  });

  if (hasSensitiveInfo) {
    console.warn("🛡️ Threshold Triggered: PII detected and shielded.");
  }
  
  return semantic; // Safe Markdown for further processing
}
```

### Advanced Options

```typescript
const result = await processHtml(html, {
  redact: true,         // Enable PII shielding
  preserveImages: false, // Strip image markers for pure text signal
  truncate: 2000        // Limit structural tokens for classification latency
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

Alete Gate prioritizes **Cognitive Sovereignty**. By performing ingestion and PII detection locally, we ensure that the user's "Informational Diet" remains private and that sensitive transactional data never enters the analysis pipeline.

## 📄 License
AGPL-3.0 - Copyright (c) 2026 [Alete Inc.](https://alete.ai/)
