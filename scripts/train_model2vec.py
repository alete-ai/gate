import os
import json
import torch
from model2vec.train import StaticModelForClassification

# Paths
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
training_data_path = os.path.join(project_root, "data/processed/training_set_flat.json")
model_dir = os.path.join(project_root, "models")
state_dict_path = os.path.join(model_dir, "Model2VecClassifierSubstrate.pt")
classes_path = os.path.join(model_dir, "Model2VecClasses.json")
tokenizer_path = os.path.join(model_dir, "model2vec_tokenizer.json")

print(f"🚀 Model2Vec: Loading training data from: {training_data_path}")

# Load training data
with open(training_data_path, "r") as f:
    training_data = json.load(f)

# Extract texts and labels
texts = [item["text"] for item in training_data]
labels = [item["label"] for item in training_data]

# Ensure output directory exists
os.makedirs(model_dir, exist_ok=True)

print("⚙️ Model2Vec: Initializing base model (minishlab/potion-base-8M)...")
classifier = StaticModelForClassification.from_pretrained(
    model_name="minishlab/potion-base-8M"
)

print("⚙️ Model2Vec: Training classification head...")
classifier = classifier.fit(texts, labels)

# Retrieve target classes
target_classes = classifier.classes.tolist()
print(f"🏷️ Target Classes: {target_classes}")

print("💾 Model2Vec: Saving custom training substrates...")

# Save state dict
torch.save(classifier.state_dict(), state_dict_path)
print(f"✅ Saved PyTorch State Dict: {state_dict_path}")

# Save target classes
with open(classes_path, "w") as f:
    json.dump(target_classes, f)
print(f"✅ Saved Classes List: {classes_path}")

# Save tokenizer json
classifier.tokenizer.save(tokenizer_path)
print(f"✅ Saved Tokenizer Config: {tokenizer_path}")

print("💎 Success: Model2Vec training substrate exported successfully.")
