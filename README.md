# Alete Gate: The Sovereign Edge Threshold 🛡️

**Alete Gate** is a high-performance, privacy-first ingestion and classification layer for the Alete ecosystem. It serves as a "Sovereign Threshold"—identifying and redacting sensitive transactional portals (banking, health, PII) locally on-device before any data is processed for analysis.

## 🚀 Key Features

- **On-Device MaxEnt Classification:** Sub-5ms native inference using Apple's `NLModel` substrate.
- **Narrative-First Redaction:** Integrated `openredaction` pipeline that shields "Toxic IDs" (SSNs, Credit Cards) while preserving story coherence.
- **Structural Ingestion:** Powered by `@mdream/js` with custom plugins to retain the "structural footprint" of web forms and portals.
- **WXT-Optimized:** Zero-dependency browser bundle (332KB) with Node.js shims, ready for Safari and Chrome extensions.
- **Sovereign Substrate:** Centralized Swift Package (`AleteGateKit`) for seamless integration across iOS apps and extensions.

---

## 📊 Performance Telemetry (Current Substrate)

Based on the latest **Strategic Verification Audit** conducted on the native Apple Intelligence substrate:

| Metric | Result | Note |
| :--- | :--- | :--- |
| **Total Accuracy** | **84.80%** | Comprehensive cross-category validation |
| **Avg. Inference Latency** | **3.19 ms** | Benchmark on Apple Neural Engine |
| **Portal Recall** | **97.44%** | Critical safety metric for blocking sensitive portals |
| **Article Precision** | **100.00%** | Zero leakage of articles into the portal category |

*Tests executed on the `PrivacyGatekeeper` MaxEnt model using the `verify_model.swift` harness.*

---

## 📦 Packages

### 1. `@alete/gate-ingest` (npm)
The unified pipeline for converting HTML into structural tokens and redacted semantic Markdown.

**Installation:**
```bash
pnpm add @alete/gate-ingest
```

**Usage (Browser/Node):**
```typescript
import { processHtml } from '@alete/gate-ingest';

const html = "<html>...</html>";
const { structural, semantic, hasSensitiveInfo } = await processHtml(html, { redact: true });
```

### 2. `AleteGateKit` (Swift Package)
The native Apple Intelligence bridge for on-device classification.

**Integration (SPM):**
Add this repository to your Xcode project or `Package.swift`:
```swift
.package(url: "https://github.com/alete-ai/gate.git", branch: "main")
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
Alete Gate prioritizes **Cognitive Sovereignty** by ensuring all PII detection happens on the edge substrate. We utilize empirical performance tracking to ensure the highest possible recall on sensitive data while maintaining a friction-less user experience.

## 📄 License
AGPL-3.0 - Copyright (c) 2026 [Alete Inc.](https://alete.ai/) <https://github.com/StoyanD>
