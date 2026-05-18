# Alete Gate: The Sovereign Edge Threshold

**Alete Gate** is a privacy-first, edge-based ingestion and classification layer for the Alete ecosystem. It serves as a "Privacy Gatekeeper"—a circuit breaker that identifies and blocks sensitive transactional portals (banking, health, PII) locally on the device before any data is sent for further analysis.

## Features

- **Privacy-First Classification:** Utilizes a sub-megabyte Apple native Maximum Entropy model (`NLModel`) for high-speed, zero-knowledge edge classification.
- **Structural Ingestion:** Powered by `@mdream/js` with custom structural overrides to preserve the "footprint" of web portals (forms, inputs, nav clusters).
- **Dual-Mode Output:** Generates both **Structural Tokens** for edge classification and clean **Semantic Markdown** for downstream LLM analysis.
- **Zero-MB Overhead:** Leverages native Apple frameworks (Natural Language, Core ML) for a near-zero app payload footprint.

## Project Structure

- `packages/gate-ingest`: Unified Node.js/TypeScript package for structural extraction and token mapping.
- `conductor/`: Strategic implementation tracks and product specifications.
- `scripts/`: Data synthesis and model training pipeline.
- `ios/`: Swift package and minimal harness for Apple native integration.
- `models/`: Repository for compiled `.mlpackage` artifacts.

## Getting Started

### Prerequisites
- [pnpm](https://pnpm.io/)
- Node.js 22+
- Xcode (for model training and iOS integration)

### Installation
```bash
pnpm install
```

### Data Synthesis
1. Place raw HTML samples in `data/raw/`.
2. Generate structural, token-mapped training data:
```bash
pnpm run synthesize
pnpm run to-csv
```

### Build Ingestion Package
```bash
pnpm build
```

## License
AGPL-3.0
