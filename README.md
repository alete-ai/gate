# Alete Gate: The Sovereign Edge Threshold 🛡️

**Alete Gate** is a high-performance, privacy-first ingestion and classification layer for the Alete ecosystem. It serves as a "Sovereign Threshold"—identifying sensitive transactional portals (banking, health, PII) locally on-device before any data is processed for analysis.

## 🚀 Key Features

- **On-Device MaxEnt Classification:** Sub-1ms native inference using Apple's `NLModel` substrate.
- **Semantic Metadata Extraction:** Powered by `@mdream/js` with fallback heuristics to extract titles and descriptions from fragmented HTML.
- **Structural Ingestion:** Optimized "structural substrate" that purifies functional markers (forms, nav) while stripping natural language noise for higher signal-to-noise ratios.
- **WXT-Optimized:** Zero-dependency browser bundle (332KB) with Node.js shims, ready for Safari and Chrome extensions.

---

## 📊 Performance Telemetry (Current Substrate)

Based on the latest **Strategic Verification Audit** conducted on the native Apple Intelligence substrate after integrating semantic metadata:

| Metric | Result | Note |
| :--- | :--- | :--- |
| **Total Accuracy** | **97.60%** | Comprehensive cross-category validation |
| **Avg. Inference Latency** | **0.48 ms** | Benchmark on Apple Silicon substrate |
| **Survival Recall** | **100.00%** | Zero sensitive portals misclassified as digestible articles |
| **Article Recall** | **100.00%** | Perfect fidelity for preserving user access to content |

*Tests executed on the `PrivacyGatekeeper` MaxEnt model (v0.1.0) using the `verify_model.swift` harness.*

---

## 📦 Packages

### 1. `@alete/gate-ingest` (npm)
The unified pipeline for converting HTML into structural tokens and semantic Markdown.

**Installation:**
```bash
pnpm add @alete/gate-ingest
```

**Usage (Browser/Node):**
```typescript
import { processHtml } from '@alete-ai/gate-ingest';

const html = "<html>...</html>";
const { structural, semantic } = await processHtml(html);
```

### 2. `AleteGateKit` (Swift Package)
The native Apple Intelligence bridge for on-device classification.

**Integration (SPM):**
Add this repository to your Xcode project or `Package.swift`:
```swift
.package(url: "https://github.com/alete-ai/gate.git", branch: "main")
```

---

## ⚡ Quick Recipes (AI-Ready Snippets)

These snippets are optimized for high-performance integration and clear semantic understanding by AI agents.

### How to identify sensitive portals in a browser extension?
```typescript
import { processHtml } from '@alete-ai/gate-ingest';

/**
 * Capture and Purify
 * This recipe prepares content for classification.
 */
async function capturePage() {
  const html = document.documentElement.outerHTML;
  const { structural, semantic } = await processHtml(html);

  return structural; // Prepared for local classification
}
```

### How to use the native PrivacyGatekeeper in an iOS App?
```swift
import AleteGateKit
import CoreML

/**
 * Edge Classification Loop
 * Evaluates structural tokens against the PrivacyGatekeeper model.
 */
func classifyContent(tokens: String) async throws -> String {
    let gatekeeper = try PrivacyGatekeeper()
    let prediction = try gatekeeper.prediction(text: tokens)
    
    // returns 'sensitive_portal', 'digestible_article', or 'noise'
    return prediction.label 
}
```

---

## 🛠️ Development & Build

### Build Pipeline
```bash
# Install dependencies
pnpm install

# Build all packages (including browser-optimized ESM)
pnpm build

# Run native substrate tests
cd ios/AleteGateKit && swift test
```

### Generating XCFramework
```bash
./scripts/build_xcframework.sh
```

---

## 🛡️ Privacy & Strategy
Alete Gate prioritizes **Cognitive Sovereignty** by ensuring all classification happens on the edge substrate. We utilize empirical performance tracking to ensure the highest possible recall on sensitive portals while maintaining a friction-less user experience.

## 📄 License
AGPL-3.0 - Copyright (c) 2026 [Alete Inc.](https://alete.ai/) <https://github.com/StoyanD>
