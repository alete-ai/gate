# Product History: Model2Vec INT4 Classifier

This file tracks the product requirements evolution, user feedback, and simulated roundtable alignment discussions chronologically.

---

## Kickoff Prompt: 2026-06-29 16:07
**Stoyan (User):**
> Hold off on pushing. Create another conductor track. We had good performance previously with a Model 2 Vec approach. Research Model 2 Vec, then create a quantized model with Int4-sized weights, train it, and compare it to Max-Int and NL contextual embedding to see how they stack up. Search online for the Model 2 Vec implementation to ensure correct implementation.

---

## Simulated Roundtable: Evaluating Model2Vec and INT4 Quantization
*Led by **Serra (System Infrastructure / Sarah)**, with contributions from the team.*

* **Serra (System Infrastructure):** "Model2Vec is highly efficient because it bypasses transformer layers entirely, relying on distilled static embeddings and simple mean pooling. However, implementing it on iOS/macOS requires custom tokenization. We must integrate Hugging Face's `swift-transformers` library to handle subword tokenization, which increases codebase complexity."
* **Leo (The Privacy Architect):** "Adding `swift-transformers` is a valid trade-off because it runs completely locally on-device. If we compress the model weights to 4-bit (INT4) using `coremltools.optimize`, the model size should stay under 5MB. This satisfies our low-footprint mandate while keeping user data private."
* **Sarah (The Optimizer):** "Our main priority is maximizing classification accuracy while keeping false-positive blocks to a minimum. The MaxEnt model had 17 false blocks, and the `NLContextualEmbedding` model cut that to 9. We need to see if a distilled Model2Vec model can match or improve on these metrics while achieving sub-2ms speeds."
* **Maya (Product Operations):** "Let's build a clean, three-way comparison matrix of the models. By testing MaxEnt (legacy), NLContextualEmbedding (BERT), and Model2Vec INT4 side-by-side on the staging holdout test set, we will have clear empirical data to make the best architectural choice."
* **Aris (Product Design):** "Model2Vec's math is simple matrix lookups and a mean pool. Latency should be sub-2ms, which is much faster than the 15-30ms of `NLContextualEmbedding`. If we can get close to MaxEnt latency but with higher accuracy, it's a massive win for user experience."

**Strategic Consensus (ESS):** Propose a Conductor Track to implement a Model2Vec training and conversion pipeline, apply INT4 quantization, and perform a three-way comparative benchmark on the edge.
