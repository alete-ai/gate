# Product Debate & Persona Round Table: Cognitive Mode Edge Classifier Retraining

## Kickoff Prompts & Refinements

### User Kickoff Prompt

> "Okay, great. Let's do a suggested and pull this out into a new conductor track called the mode edge classifier evolution. And then I've also added the repo for our classifier, which is in Git slash gate is the classifier we're using. You can also check it inside of our extension in our repo currently here.
>
> Let's try to use the same structure classifier that we already have and also create a conductor track inside that repo for the classifier side of this track. That way we have both the elite side implementation on our client and our extension to use the classifier and also a track on our classifier repo as well to actually perform the retraining as well.
>
> And then we'll work on both and then merge them in. So go ahead and do that."

### User Refinement Prompt

> "Look at the cognitive mode edge classifier retraining conducted track. We want to update the classification labels that we use because we're making a change in our client project that utilizes this edge classifier library. We want to do a retraining using the new labels.
>
> Let's also check what the most capable model is that we can use from Google to do the LLM labeling that we use inside of our classifier. And also let's use best practices on retaining the test data set and also trying to have appropriate amounts of each category inside of our training and test data to make sure we don't overfit for a particular category.
>
> Let's have Sarah from the lead team lead this conversation based off of what I've said and continue updating the product.md file and the conductor track before we do an implementation. Let's just do the update of the conductor track for now. We also want to pull all of the raw staging extractions from the staging database as part of our test data that we'll then use as we previously just stated."

---

## 1. The Strategic Crucible: Team Debate (Led by Sarah)

### Stage 1: Agenda Setting & Sound Off

- **Sarah (The Optimizer / Senior AI PM - Host):** "Team, let's align. We are transitioning the edge classifier to the new 4-class target space (`deep_work`, `informational`, `communication`, `noise`) to match the client's cognitive telemetry overhaul. To build a robust model, we must fetch the full set of raw staging database extractions as our holdout test dataset. To label these accurately, we must select the most capable reasoning model from Google Cloud Vertex AI: **Gemini 2.5 Pro** (or **Gemini 3.1 Pro** if available). Finally, we must enforce strict dataset balancing rules during compilation to prevent the model from overfitting to dominant categories (like informational blogs or retail noise)."

- **Julian (Visionary Specialist - He/Him):** "Our core narrative of 'Cognitive Sovereignty' requires high classification fidelity. If the model misclassifies a developer's IDE or pull request (`deep_work`) as `noise` or `communication`, we fail the user's trust. Moving to Gemini 2.5 Pro for ground-truth labeling ensures that complex code structures and developer dashboards are classified correctly, establishing a high-signal baseline."

- **Maya (Product Operations - She/Her):** "Dataset balancing is our primary defense against bias. Staging extractions from developers will be heavily skewed toward `informational` (docs, StackOverflow) and `deep_work` (GitHub). If we train on this raw distribution, the classifier will overfit. We must enforce a target of 150–200 samples per class. We will downsample overrepresented classes using a deterministic hash and use regex/keyword heuristic boosters to supplement underrepresented classes like `communication`."

- **Serra (System Infrastructure - She/Her):** "From an engineering perspective, migrating from `gemini-2.5-flash` to `gemini-2.5-pro` for batch labeling is straightforward but increases API costs. We will implement incremental caching based on content hashes in `label_extractions.ts` to ensure we never re-label a document we've already processed. Pulling all raw staging extractions directly to `data/raw_staging_extractions.json` ensures that our test set remains independent and representative of real-world extension usage."

- **Aris (Sensory Specialist - He/Him):** "Sensory friction will decrease if we sort and group cognitive data cleanly. The native model must execute inferences under 10ms on-device. Since MaxEnt scales with token vocabulary, the compilation step must scrub boilerplate HTML/CSS and only retain clean structural tokens to keep the compiled model size under 1MB."

- **Lyra (Narrative Specialist - They/Them):** "The daily summary is the user's narrative mirror. For the summary to feel authentic and grounded, the classification must correctly distinguish between deep, focused coding sessions (`deep_work`) and chat collaboration (`communication`). A balanced dataset is the only way to prevent narrative distortion."

### Stage 2: The Cross-Critique

- **Serra to Maya:** "How will we guarantee that our downsampling doesn't throw away valuable edge cases? We should use stratified sampling so that we keep a diverse range of domains (e.g., wiki pages vs. StackOverflow answers within `informational`) rather than a simple random cut."
- **Maya to Serra:** "Agreed. We will split the fetched staging data using a stratified 80/20 train/test split. The 20% holdout test set will be saved as `data/staging_test_set.json` and kept strictly separated to evaluate real-world performance."
- **Julian to Leo (The Privacy Architect):** "We must make sure that when we transition to the 4 cognitive classes, we don't accidentally leak PII in our structural tokens. The anonymizer script must be updated to strip personal handles, project names, and email signatures from code blocks and chat snippets."

### Stage 3: The Nash Equilibrium (Synthesis)

- **Survival Metric:** The Apple native MaxEnt text classifier achieves >92% overall accuracy, and at least 90% recall/precision individually on the holdout test set (`data/staging_test_set.json`), while maintaining a file size of less than 1.2MB.

---

## 2. Persona Round Table & Time To Value (TTV)

### Leo (The Privacy Architect / Substrate Specialist)

- *Critique (Serra & Aris):* Leo wants a lightweight model that executes in milliseconds without leaking user details. Transitioning to the 4 classes using clean, anonymized structural tokens keeps the on-device footprint small and PII-free.
- *TTV Score:* **9.5/10** (PII scrubbing and caching keep compliance risk at zero).

### Sarah (The Informational Diet Tracker / The Optimizer)

- *Critique (Julian & Maya):* Sarah needs the category metrics to be balanced. Enforcing strict dataset balancing (150-200 samples per class) during compilation prevents class bias, providing highly accurate diet metrics.
- *TTV Score:* **10/10** (Balanced data guarantees accurate cognitive insights from day one).

### Marcus (The Cognitive Sovereign / The Alpha-Curator)

- *Critique (Aris & Lyra):* Marcus needs high-precision predictions to back up the 'Zero-Knowledge' marketing claims. Using Google's most capable model (Gemini 2.5 Pro) for ground-truth labeling guarantees the model learns from premium, high-fidelity labels.
- *TTV Score:* **9.5/10** (High-quality labeling provides robust proof of on-device classification accuracy).

