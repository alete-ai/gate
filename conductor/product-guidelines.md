# Product Guidelines: Alete Gate

## Voice and Tone

- **Direct & Minimalist:** Short, functional messages. Stay out of the user's way and focus on delivering value with minimal cognitive load.

## Structural and Semantic Extraction

- **Structural Markdown:** Optimized structural elements (e.g. headers, buttons, links) are preserved, while natural language noise is stripped. This structural representation provides high signal for portal vs. article classification.
- **Semantic Markdown:** Comprehensive markdown containing both structural layout and textual content. Used to analyze the article's narrative value and cognitive index.

## Edge Classification Policy

- **Sovereign Edge Ingestion:** All classification must occur on-device (local CoreML model) to ensure user privacy and compliance stability.
- **High Recall on Sensitive Portals:** Avoid misclassifying sensitive banking or healthcare portals as digestible articles. False positives (treating digestible articles as sensitive) should be minimized to avoid user friction, but false negatives (leaking sensitive portals) are a catastrophic risk.
