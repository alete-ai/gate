import os
import json
import time
import numpy as np
import coremltools as ct
from transformers import AutoTokenizer

def build_classifier_input(url_host, url_path_keywords, title, tokens):
    combined = ""
    if url_host:
        clean_host = url_host.lower().strip().replace("www.", "")
        if clean_host:
            combined += f"urlHost_{clean_host} "
    
    if url_path_keywords:
        combined += " ".join([f"urlPath_{kw}" for kw in url_path_keywords]) + " "
        
    if title:
        clean_title = title.lower()
        import re
        clean_title = re.sub(r'[^a-z0-9\s]', ' ', clean_title)
        words = [w.strip() for w in clean_title.split() if w.strip()]
        if words:
            combined += " ".join([f"title_{w}" for w in words]) + " "
            
    combined += tokens.strip()
    return combined.strip()

def evaluate_dataset(mlmodel, tokenizer, classes, file_path, name):
    print("\n" + "-"*40)
    print(f"🔍 Evaluating Dataset: {name}")
    print(f"📍 File: {file_path}")
    print("-"*40)
    
    if not os.path.exists(file_path):
        print("⚠️ File does not exist, skipping evaluation.")
        return
        
    with open(file_path, "r") as f:
        json_data = json.load(f)
        
    correct = 0
    total = 0
    false_positives = 0 # noise/informational predicted as deep_work/communication
    false_negatives = 0 # deep_work/communication predicted as noise
    latencies = []
    
    class_stats = {cls: {"tp": 0, "fp": 0, "fn": 0, "total": 0} for cls in classes}
    target_classes = ["deep_work", "informational", "communication", "noise"]
    
    print(f"🔍 Running Core ML inference on {len(json_data)} samples...")
    
    for idx, sample in enumerate(json_data):
        structural = sample.get("structural", "")
        metadata = sample.get("metadata", {})
        
        # Label mapping
        raw_expected = sample.get("label", "unknown")
        expected = raw_expected
        if raw_expected in ["sensitive_portal", "digestible_article"]:
            url = metadata.get("url", sample.get("url", ""))
            if raw_expected == "digestible_article":
                expected = "informational"
            else:
                url_lower = url.lower()
                if any(x in url_lower for x in ["slack", "mail", "teams", "discord"]):
                    expected = "communication"
                else:
                    expected = "deep_work"
                    
        title = metadata.get("title", sample.get("title", ""))
        url_host = metadata.get("urlHost", sample.get("urlHost", ""))
        url_path_keywords = metadata.get("urlPathKeywords", sample.get("urlPathKeywords", []))
        
        combined_text = build_classifier_input(url_host, url_path_keywords, title, structural)
        
        # Tokenize
        tokens = tokenizer.encode(combined_text)
        if not tokens:
            tokens = [0] # fallback
        if len(tokens) > 4096:
            tokens = tokens[:4096]
            
        # Core ML input multiarray format: shape (1, seq_len)
        input_ids = np.array([tokens], dtype=np.float32) # coremltools expect float or int32 depending on conversion
        
        start_time = time.perf_counter()
        # Native macOS Core ML prediction
        prediction = mlmodel.predict({"input_ids": input_ids})
        latency = time.perf_counter() - start_time
        latencies.append(latency)
        
        logits = prediction["logits"][0] # logits shape [4]
        # Softmax
        exp_logits = np.exp(logits - np.max(logits))
        probabilities = exp_logits / np.sum(exp_logits)
        
        max_idx = np.argmax(probabilities)
        prediction_label = classes[max_idx]
        confidence = probabilities[max_idx]
        
        total += 1
        class_stats[expected]["total"] += 1
        
        if prediction_label == expected:
            correct += 1
            class_stats[expected]["tp"] += 1
        else:
            class_stats[expected]["fn"] += 1
            class_stats[prediction_label]["fp"] += 1
            
            # Track false positives (blocks) and false negatives (leaks)
            expected_is_sensitive = expected in ["deep_work", "communication"]
            predicted_is_sensitive = prediction_label in ["deep_work", "communication"]
            
            if expected_is_sensitive and prediction_label == "noise":
                false_negatives += 1
                print(f"🚨 [Index {idx}] PORTAL LEAK: Expected {expected}, Got {prediction_label} ({confidence*100:.1f}%)")
            elif (expected in ["noise", "informational"]) and predicted_is_sensitive:
                false_positives += 1
                print(f"📖 [Index {idx}] FALSE BLOCK: Expected {expected}, Got {prediction_label} ({confidence*100:.1f}%)")
            else:
                print(f"❌ [Index {idx}] MISCLASS: Expected {expected}, Got {prediction_label} ({confidence*100:.1f}%)")
                
    accuracy = (correct / total) * 100 if total > 0 else 0
    avg_latency = (sum(latencies) / len(latencies)) * 1000 if latencies else 0
    p50 = np.percentile(latencies, 50) * 1000 if latencies else 0
    p90 = np.percentile(latencies, 90) * 1000 if latencies else 0
    p99 = np.percentile(latencies, 99) * 1000 if latencies else 0
    
    print(f"\n📊 RESULTS FOR {name.upper()}")
    print(f"✅ Accuracy:      {accuracy:.2f}%")
    print(f"⏱️ Avg Latency:   {avg_latency:.2f} ms")
    print(f"⏱️ P50 Latency:   {p50:.2f} ms")
    print(f"⏱️ P90 Latency:   {p90:.2f} ms")
    print(f"⏱️ P99 Latency:   {p99:.2f} ms")
    print(f"🔴 False Negs (Leaks):    {false_negatives}")
    print(f"🟡 False Pos (Blocks):    {false_positives}")
    
    print("\n--- Per-Class Performance Matrix ---")
    print("LABEL               | PRECISION | RECALL    | F1 SCORE  | SUPPORT")
    print("--------------------|-----------|-----------|-----------|--------")
    for label in sorted(target_classes):
        stats = class_stats.get(label, {"tp": 0, "fp": 0, "fn": 0, "total": 0})
        tp, fp, fn, support = stats["tp"], stats["fp"], stats["fn"], stats["total"]
        
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
        
        print(f"{label:<19} | {precision:<9.4f} | {recall:<9.4f} | {f1:<9.4f} | {support}")

def main():
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    model_path = os.path.join(project_root, "models/Model2VecGatekeeper.mlpackage")
    tokenizer_path = os.path.join(project_root, "models/Model2VecTokenizerDir")
    classes_path = os.path.join(project_root, "models/Model2VecClasses.json")
    
    main_data_path = os.path.join(project_root, "data/processed/training_set.json")
    staging_test_path = os.path.join(project_root, "data/staging_test_set.json")
    
    print("🚀 Model2Vec Native Verification Harness Starting...")
    print(f"📍 Loading Model: {model_path}")
    mlmodel = ct.models.MLModel(model_path)
    
    print("⚙️ Loading Tokenizer & Classes...")
    tokenizer = AutoTokenizer.from_pretrained(tokenizer_path)
    with open(classes_path, "r") as f:
        classes = json.load(f)
        
    evaluate_dataset(mlmodel, tokenizer, classes, main_data_path, "Main Training Set")
    evaluate_dataset(mlmodel, tokenizer, classes, staging_test_path, "Staging Holdout Test Set")

if __name__ == "__main__":
    main()
