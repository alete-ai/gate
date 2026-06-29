# Product History: NL Contextual Embedding Classifier

This file tracks the product requirements evolution, user feedback, and simulated roundtable alignment discussions chronologically.

---

## Kickoff Prompt: 2026-06-29 14:41
**Stoyan (User):**
> Are there any other classifiers that we can run on our edge in iOS and Mac that will give us better base performance on analyzing the content the users' browser is seeing than the one we are currently running? Google this, and check up on both what Core ML supports and what other people have been able to use in Core ML, and then tell me what the results are—

---

## Simulated Roundtable: Evaluating Edge Classifiers
*Led by **Serra (System Infrastructure / Sarah)**, with contributions from the team.*

* **Serra (System Infrastructure):** "The current Maximum Entropy (MaxEnt) model is extremely fast (~0.97ms) and lightweight (608KB), but it has a significant validation drop-off (from 97.6% training to 86.89% on the staging holdout set). This indicates it isn't generalizing well to real-world browser markdown structure. We need to introduce sequence and contextual awareness."
* **Julian (Vision):** "To maintain cognitive autonomy, we must ensure our classification remains on the local edge substrate. If we move classification to the cloud, we compromise the zero-knowledge stance that Marcus uses as our core brand differentiator."
* **Maya (Product Operations):** "We have two viable paths for upgrading accuracy:
  1. *Transfer Learning via Apple's native `NLContextualEmbedding` (BERT-based OS substrate).*
  2. *Custom MiniLM/MobileBERT via coremltools.*
  Option 1 keeps the bundle size sub-2MB because the OS holds the weights. Option 2 introduces 80MB+ of model bloat and complex Swift tokenization code. From an ROI perspective, Option 1 is the clear path forward."
* **Aris (Product Design):** "With `NLContextualEmbedding`, we expect latency to shift to 15ms-35ms. This is slightly slower but still invisible to the browser extension's UI loop. However, we must implement an asset warmup routine on application launch to avoid an initial frame-drop or spinner."
* **Lyra (Narrative):** "Upgrading the model lets us confidently claim we have the most accurate, secure on-device cognitive filter on the market, directly reinforcing our brand positioning."

**Strategic Consensus (ESS):** Propose a Conductor Track to evaluate Apple's native `NLContextualEmbedding` transfer-learning pipeline, compare holdout validation metrics, and profile real-world latency.

---

## Refinement Prompt: 2026-06-29 15:52
**Stoyan (User):**
> Let's create a conductor track for implementing the NL Contextual Embedding. Option: and then once implemented, let's run it, train it, and then check the inference performance and compare it to our current model. Create the conductor track for now.

---

## Simulated Roundtable: Specification & Track Alignment
*Led by **Serra (System Infrastructure / Sarah)**.*

* **Serra (System Infrastructure):** "I will establish the specification [spec.md](./spec.md) and plan [plan.md](./plan.md) directories. Our goal is to evaluate if `NLContextualEmbedding` can deliver 91%+ validation accuracy while keeping compiled models under 3MB and average latencies under 40ms."
* **Leo (The Privacy Architect):** "I approve of this approach. It maintains our zero-knowledge architecture, doesn't add third-party tokenization code, and utilizes Apple's native Neural Engine optimizations."
* **Sarah (The Optimizer):** "Let's ensure the verification script outputs a clean, back-to-back comparison table of the MaxEnt model vs. the Transformer model. We need clear data to prove this is a true product upgrade."
