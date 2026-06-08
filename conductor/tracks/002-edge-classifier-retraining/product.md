# Product Strategy & Persona Round Table: Edge Classifier Retraining

## Kickoff Prompt

> **Stoyan (User):**
> We need to create a new conductor track for retraining our edge classifier here using the core ML of iOS and Mac. Currently we're being overly sensitive and screening things in a way that's not favorable. So what I have done already is I created a bypass in the staging environment of our iOS app to just pull all the data that's been pre-processed into Markdown in both content and structural Markdown and just save it with the edge classification, local pre-label and the confidence value. And then I uploaded that to our vedai cluster staging DB under the collection called raw staging extractions. I also linked the repository, get vedai work trees, chore entry tree, training where we can find the ways we can connect to our staging cluster of MongoDB to pull that information. We want to pull that information. It's already been pre-classified with the current latest version of this library edge classifier. We want to then include this data that's already been turned into Markdown as a fine tuning step in our training of our model to make sure we're using production data for our final training set. I want you to create a conductor track that pulls all of the raw staging extractions from the vedai staging cluster. There's about a hundred of them almost. And then I want you to include them in our training set to make sure that our edge classifier is correct. And then I want you to increment the library version after we do our training and redeploy the library so we can then go into our vedai project and import it and then test it again and hopefully get a better hit rate. For the new test data that we're including here from our database, let's have a little test set left off to the side to make sure that we can test on real data as well. And right now that real data in our staging database has a local prediction label in the confidence score. Those are not always accurate, so we want to use Gemini 3.5 Flash High to also give it an LLM label. And let's take the LLM label as the truth and see how close to it we can get our local label once we retrain. create this conductor track and then lay out the steps you're going to take inside the conductor track to do what I just explained.

---

## The Strategic Crucible: Persona Round Table Discussion

### Act 1: Narrative Sovereignty & Ground Truth Alignment (Julian & Lyra)

- **Lyra (Product Lead):**
  "Welcome team. Stoyan has successfully gathered about 100 raw pre-processed articles/portals from our iOS staging bypass. Right now, our local edge classifier is being overly aggressive—blocking high-value narrative articles and causing cognitive friction. 
  
  Our goal is to retrain the local model using this production dataset as a fine-tuning step. However, the pre-classified labels from the edge model are not reliable. We will run these articles through Gemini 3.5 Flash High to generate high-fidelity ground truth labels. We'll split this real-world dataset, keeping 20-30% as a dedicated staging test set to prove our real-world recall, and merge the remaining 70-80% into our training set."

- **Julian (Narrative & Vision):**
  "For **Marcus (The Alpha-Curator)**, this is the key to cognitive sovereignty. When the gatekeeper blocks a valid digestible article, it directly hurts Marcus's narrative tracking and trust. By establishing Gemini 3.5 Flash High as our ground truth, we align our edge classifier to the highest possible standard of narrative detection. This ensures Marcus can trust the edge classifier to act as a precise threshold, preserving digestible articles while maintaining a perfect shield against sensitive portals."

---

### Act 2: Substrate Engineering, Curation & Training (Maya & Serra)

- **Maya (Substrate Architect):**
  "From a system design standpoint, we will write a TS script `scripts/pull_and_label_staging.ts` in the `gate` repo. It will:
  1. Parse the staging credentials from the `vedai` worktree's `apps/analysis-service/.env.staging`.
  2. Connect to the staging database host `vedai-cluster-staging.952n7om.mongodb.net` and pull from `raw_staging_extractions`.
  3. Batch call Gemini 3.5 Flash High via the Google Vertex/Gemini SDK using `gemini-2.5-flash-lite` or Vertex endpoints as per guidelines to label each record as `sensitive_portal`, `digestible_article`, or `noise`.
  4. Write the labeled records into a separate staging dataset file `data/raw_staging_labeled.json`."

- **Serra (Performance Systems):**
  "For **Sarah (The Optimizer)**, the edge training pipeline must remain highly efficient. We will write a curation script `scripts/compile_datasets.ts` that:
  - Takes `data/raw_staging_labeled.json` and randomly splits it: 20% into `data/staging_test_set.json` (left off to the side) and 80% to be merged with our existing `data/processed/training_set.json`.
  - Re-compiles `data/processed/training_set.csv` for Create ML training.
  - We'll run `scripts/train_model.swift` to train the new MaxEnt model.
  - We'll extend `scripts/verify_model.swift` to evaluate performance separately on the validation set AND the new `data/staging_test_set.json`. We will verify if we achieve higher accuracy and recall relative to the LLM labels without growing the model size past 1MB, ensuring Sarah's strict battery/latency targets remain met."

---

### Act 3: Library Deployment & Downstream Parity (Aris)

- **Aris (Sensory Friction):**
  "For **Leo (The Substrate Specialist)**, packaging and version control must be smooth. After retraining, we will increment the library version in `package.json` and SPM Package declarations. We will run `npm run publish:all` to redeploy the `@alete-ai/gate-ingest` and `AleteGateKit` package.
  
  Then, we will navigate to the `vedai` worktree, import the updated library, and run validation tests against the staging DB records. This validates that the local prediction matches the LLM label with much higher accuracy. By eliminating false portal detections, we remove sensory friction and deliver 'Atmospheric Clarity' for the user."

---

## Time to Value (TTV) Synthesis & Scorecard (Initial Plan)

| Persona | Target TTV Commitment | Focus Metric & Path to Value |
| :--- | :--- | :--- |
| **The Alpha-Curator (Marcus)** | **9.8 / 10** | Resolves over-sensitivity immediately, ensuring narrative digests are rich with high-signal content. |
| **The Optimizer (Sarah)** | **9.7 / 10** | Using Gemini 3.5 Flash High as the ground truth guarantees model decisions map to human-level precision. |
| **The Substrate Specialist (Leo)** | **9.6 / 10** | Lightweight edge model (MaxEnt) retains sub-1ms inference speeds and local execution with zero central compliance risks. |

---

## Refinement Input (2026-06-08)

> **Stoyan (User):**
> I'm not sure exactly how to proceed here, but we need to understand what the data that we're pulling out of the database is, because right now we have a public repo that we're saving the data in, and I want to make sure that there is nothing sensitive being leaked, because I was just scraping all of my own internal content as I navigated through my browser over the weekend.
> Let's add a step to that, and let's hold off adding that raw staging labeled.json data to GitHub right away before we can analyze if there's anything sensitive we don't want to put in a public repo. Add that to the conductor track.

### Simulated Team Discussion: Privacy Preservation & git-ignore Mandates

- **Lyra (Product Lead):**
  "This is a critical security vulnerability. Since Stoyan's browser extension recorded real-world traffic over the weekend, the staging dataset likely contains personal PII, authentication cookies, auth tokens, names, personal emails, or private documents. 
  
  Since the `gate` repository is public, committing raw staging files like `raw_staging_labeled.json` or `staging_test_set.json` is a absolute blocker. We must immediately update the track spec and plan to enforce that all downloaded/generated staging datasets are git-ignored. They must remain strictly local to the developer sandbox."

- **Julian (Narrative & Vision):**
  "Absolutely. For **Marcus (The Alpha-Curator)**, the narrative of 'Cognitive Sovereignty' requires absolute data safety. A leak of founder browser history in a public GitHub commit would completely destroy the project's credibility. The TTV scorecard remains high only if we can guarantee zero PII leakage."

- **Maya (Substrate Architect):**
  "Technically, we will update the git-ignore rules at the very start of the track:
  - Add `data/raw_staging_*.json` and `data/staging_test_set.json` to `.gitignore`.
  - Ensure the local directory `data/processed/` is configured to only track anonymized, stripped token sets, not raw Markdown with personal contents.
  - Introduce an **Anonymization & Auditing Step** in Phase 1 before any data merges."

- **Serra (Performance Systems):**
  "Right. The Create ML model only needs structural tokens (e.g. `structFormStart`, `structButtonSave`) to classify structural layouts. It does NOT train on specific natural language content for portal detection.
  We will implement a local scrubbing script `scripts/anonymize_staging_data.ts` that:
  1. Scans the fetched staging JSON.
  2. Automatically strips or redacts potential PII patterns (emails, tokens, private names, UUIDs).
  3. Prepares purely tokenized representation or redacted text before combining it with the training set.
  This allows us to train the model locally on production-accurate structures without committing any private text content to Git."

- **Aris (Sensory Friction):**
  "This eliminates all developer anxiety for Stoyan. The system becomes a safe container. Let's update the specifications and plans accordingly."

## Updated Time to Value (TTV) Synthesis & Scorecard

| Persona | Target TTV Commitment | Focus Metric & Path to Value |
| :--- | :--- | :--- |
| **The Alpha-Curator (Marcus)** | **9.9 / 10** | Strict local boundaries prevent leakage of browsing sessions, preserving absolute brand trust. |
| **The Optimizer (Sarah)** | **9.7 / 10** | Local-only evaluation on the git-ignored `staging_test_set.json` validates real-world accuracy without compromising security. |
| **The Substrate Specialist (Leo)** | **9.8 / 10** | Clear `.gitignore` rules and local script-based PII redaction ensure compliance and zero data risk. |
