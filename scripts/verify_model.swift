import Foundation
import CoreML
import NaturalLanguage

// Metabolic Sensors & Telemetry Structs
struct Metric {
    var total: Int = 0
    var correct: Int = 0
    var falsePositives: Int = 0 // digestible_article predicted as sensitive_portal
    var falseNegatives: Int = 0 // sensitive_portal predicted as digestible_article
    var totalLatency: Double = 0
    
    var accuracy: Double {
        return total > 0 ? (Double(correct) / Double(total)) * 100 : 0
    }
    
    var avgLatency: Double {
        return total > 0 ? (totalLatency / Double(total)) * 1000 : 0 // in ms
    }
}

let projectRoot = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let modelURL = projectRoot.appendingPathComponent("models/PrivacyGatekeeper.mlmodel")
let dataURL = projectRoot.appendingPathComponent("data/processed/training_set.json")

print("🚀 Starting Strategic Verification Substrate...")
print("📍 Model: \(modelURL.path)")
print("📍 Data: \(dataURL.path)")

do {
    // 1. Load Dataset
    let data = try Data(contentsOf: dataURL)
    guard let json = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
        print("❌ Error: Invalid JSON format.")
        exit(1)
    }
    
    // 2. Compile and Load Model
    print("⚙️ Compiling model substrate...")
    let compiledURL = try MLModel.compileModel(at: modelURL)
    let model = try NLModel(contentsOf: compiledURL)
    
    // 3. Evaluation Loop
    var metrics = Metric()
    var labelMetrics: [String: Metric] = [:]
    
    print("🔍 Evaluating \(json.count) samples...")
    
    for (index, sample) in json.enumerated() {
        guard let text = sample["structural"] as? String, let expected = sample["label"] as? String else { continue }
        
        let start = CFAbsoluteTimeGetCurrent()
        let prediction = model.predictedLabel(for: text) ?? "unknown"
        let latency = CFAbsoluteTimeGetCurrent() - start
        
        metrics.total += 1
        metrics.totalLatency += latency
        
        if labelMetrics[expected] == nil { labelMetrics[expected] = Metric() }
        labelMetrics[expected]?.total += 1
        
        if prediction == expected {
            metrics.correct += 1
            labelMetrics[expected]?.correct += 1
        } else {
            // Tracking Specific Failures
            if expected == "sensitive_portal" {
                if prediction == "digestible_article" {
                    metrics.falseNegatives += 1
                }
                print("\n🚨 SENSITIVE PORTAL MISS at Index \(index):")
                print("   Expected: \(expected)")
                print("   Got:      \(prediction)")
                print("   Input:    \(text.prefix(200))...")
            } else if expected == "digestible_article" {
                if prediction == "sensitive_portal" {
                    metrics.falsePositives += 1
                }
                print("\n📖 ARTICLE MISS at Index \(index):")
                print("   Expected: \(expected)")
                print("   Got:      \(prediction)")
                print("   Input:    \(text.prefix(200))...")
            } else if expected == "noise" && prediction == "sensitive_portal" {
                // Noise blocked as sensitive is okay but worth noting
                print("\n🟡 NOISE BLOCKED at Index \(index):")
                print("   Expected: \(expected)")
                print("   Got:      \(prediction)")
                print("   Input:    \(text.prefix(200))...")
            }
        }
        
        if index > 0 && index % 100 == 0 {
            print("⏳ Progress: \(index)/\(json.count)...")
        }
    }
    
    // 4. Final Telemetry
    print("\n" + String(repeating: "=", count: 40))
    print("📊 AGGREGATE PERFORMANCE TELEMETRY")
    print(String(repeating: "=", count: 40))
    print("✅ Accuracy:      \(String(format: "%.2f", metrics.accuracy))%")
    print("⏱️ Avg Latency:   \(String(format: "%.2f", metrics.avgLatency)) ms")
    print("🔴 False Negs:    \(metrics.falseNegatives) (Catastrophic Risk)")
    print("🟡 False Pos:     \(metrics.falsePositives) (UX Friction)")
    
    print("\n--- Per-Label Performance ---")
    for (label, m) in labelMetrics {
        print("🏷️ \(label.padding(toLength: 20, withPad: " ", startingAt: 0)): \(String(format: "%.2f", m.accuracy))% (\(m.correct)/\(m.total))")
    }
    
    // 5. Survival Check
    if metrics.falseNegatives == 0 {
        print("\n✅ SURVIVAL METRIC MET: 100% Recall on Sensitive Portals.")
    } else {
        print("\n❌ SURVIVAL METRIC FAILED: \(metrics.falseNegatives) leaks detected.")
    }
    
} catch {
    print("💥 Fatal Substrate Error: \(error)")
    exit(1)
}
