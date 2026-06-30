import Foundation
import CoreML
import NaturalLanguage

// Swift translation of JS classifier input builder
func buildClassifierInput(urlHost: String?, urlPathKeywords: [String]?, title: String?, tokens: String) -> String {
    var combined = ""
    
    if let host = urlHost, !host.isEmpty {
        let cleanHost = host.lowercased().trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: "www.", with: "")
        if !cleanHost.isEmpty {
            let components = cleanHost.components(separatedBy: CharacterSet(charactersIn: ".-"))
            let camelHost = components.map { $0.prefix(1).uppercased() + $0.dropFirst() }.joined()
            combined += "urlHost\(camelHost) "
        }
    }
    
    if let pathKeywords = urlPathKeywords, !pathKeywords.isEmpty {
        let mapped = pathKeywords.map { "urlPath\($0.prefix(1).uppercased() + $0.dropFirst())" }
        combined += mapped.joined(separator: " ") + " "
    }
    
    if let titleStr = title, !titleStr.isEmpty {
        let cleanTitle = titleStr.lowercased()
        let pattern = "[^a-z0-9\\s]"
        if let regex = try? NSRegularExpression(pattern: pattern, options: []) {
            let range = NSRange(location: 0, length: cleanTitle.utf16.count)
            let replaced = regex.stringByReplacingMatches(in: cleanTitle, options: [], range: range, withTemplate: " ")
            let words = replaced.components(separatedBy: .whitespacesAndNewlines)
                .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
                .filter { !$0.isEmpty }
            if !words.isEmpty {
                let mapped = words.map { "title\($0.prefix(1).uppercased() + $0.dropFirst())" }
                combined += mapped.joined(separator: " ") + " "
            }
        }
    }
    
    combined += tokens.trimmingCharacters(in: .whitespacesAndNewlines)
    return combined.trimmingCharacters(in: .whitespacesAndNewlines)
}

// Metabolic Sensors & Telemetry Structs
struct Metric {
    var total: Int = 0
    var correct: Int = 0
    var falsePositives: Int = 0 // noise/informational predicted as deep_work/communication
    var falseNegatives: Int = 0 // deep_work/communication predicted as noise
    var totalLatency: Double = 0
    var latencies: [Double] = []
    
    var accuracy: Double {
        return total > 0 ? (Double(correct) / Double(total)) * 100 : 0
    }
    
    var avgLatency: Double {
        return total > 0 ? (totalLatency / Double(total)) * 1000 : 0 // in ms
    }
    
    var p50: Double {
        guard !latencies.isEmpty else { return 0 }
        let sorted = latencies.sorted()
        return sorted[sorted.count / 2] * 1000
    }
    
    var p90: Double {
        guard !latencies.isEmpty else { return 0 }
        let sorted = latencies.sorted()
        let index = Int(Double(sorted.count) * 0.9)
        return sorted[min(index, sorted.count - 1)] * 1000
    }
    
    var p99: Double {
        guard !latencies.isEmpty else { return 0 }
        let sorted = latencies.sorted()
        let index = Int(Double(sorted.count) * 0.99)
        return sorted[min(index, sorted.count - 1)] * 1000
    }
}

struct ClassMetrics {
    var tp = 0
    var fp = 0
    var fn = 0
    var total = 0
    
    var precision: Double {
        let denom = tp + fp
        return denom > 0 ? Double(tp) / Double(denom) : 0.0
    }
    
    var recall: Double {
        let denom = tp + fn
        return denom > 0 ? Double(tp) / Double(denom) : 0.0
    }
    
    var f1: Double {
        let p = precision
        let r = recall
        let denom = p + r
        return denom > 0 ? 2.0 * (p * r) / denom : 0.0
    }
}

func evaluateDataset(model: NLModel, fileURL: URL, name: String) {
    print("\n----------------------------------------")
    print("🔍 Evaluating Dataset: \(name)")
    print("📍 File: \(fileURL.path)")
    print("----------------------------------------")
    
    guard FileManager.default.fileExists(atPath: fileURL.path) else {
        print("⚠️ File does not exist, skipping evaluation.")
        return
    }
    
    do {
        let data = try Data(contentsOf: fileURL)
        guard let json = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
            print("❌ Error: Invalid JSON format.")
            return
        }
        
        var metrics = Metric()
        var classStats: [String: ClassMetrics] = [:]
        let targetClasses = ["privacy_work", "informational", "communication", "noise"]
        for cls in targetClasses {
            classStats[cls] = ClassMetrics()
        }
        
        print("🔍 Running inference on \(json.count) samples...")
        
        for (index, sample) in json.enumerated() {
            let structural = sample["structural"] as? String ?? ""
            let metadata = sample["metadata"] as? [String: Any] ?? [:]
            
            // Map legacy labels if they exist in the test dataset to keep compatibility
            let rawExpected = sample["label"] as? String ?? "unknown"
            let expected: String
            if rawExpected == "deep_work" {
                expected = "privacy_work"
            } else if rawExpected == "sensitive_portal" || rawExpected == "digestible_article" {
                let url = metadata["url"] as? String ?? sample["url"] as? String ?? ""
                if rawExpected == "digestible_article" {
                    expected = "informational"
                } else {
                    let urlLower = url.lowercased()
                    if urlLower.contains("slack") || urlLower.contains("mail") || urlLower.contains("teams") || urlLower.contains("discord") {
                        expected = "communication"
                    } else {
                        expected = "privacy_work"
                    }
                }
            } else {
                expected = rawExpected
            }
            
            let title = metadata["title"] as? String ?? sample["title"] as? String ?? ""
            let urlHost = metadata["urlHost"] as? String ?? sample["urlHost"] as? String ?? ""
            let urlPathKeywords = metadata["urlPathKeywords"] as? [String] ?? sample["urlPathKeywords"] as? [String] ?? []
            
            // Combined text format matching Create ML input
            let combinedText = buildClassifierInput(urlHost: urlHost, urlPathKeywords: urlPathKeywords, title: title, tokens: structural)
            
            let start = CFAbsoluteTimeGetCurrent()
            let hypotheses = model.predictedLabelHypotheses(for: combinedText, maximumCount: 4)
            let prediction = model.predictedLabel(for: combinedText) ?? "unknown"
            let confidence = hypotheses[prediction] ?? 0.0
            let latency = CFAbsoluteTimeGetCurrent() - start
            
            metrics.total += 1
            metrics.totalLatency += latency
            metrics.latencies.append(latency)
            
            if classStats[expected] == nil {
                classStats[expected] = ClassMetrics()
            }
            classStats[expected]?.total += 1
            
            if prediction == expected {
                metrics.correct += 1
                classStats[expected]?.tp += 1
            } else {
                classStats[expected]?.fn += 1
                if classStats[prediction] == nil {
                    classStats[prediction] = ClassMetrics()
                }
                classStats[prediction]?.fp += 1
                
                // Track leaks and blocks
                let expectedIsSensitive = expected == "privacy_work" || expected == "communication"
                let predictedIsSensitive = prediction == "privacy_work" || prediction == "communication"
                
                if expectedIsSensitive && prediction == "noise" {
                    metrics.falseNegatives += 1
                    print("🚨 [Index \(index)] PORTAL LEAK: Expected \(expected), Got \(prediction) (\(String(format: "%.1f", confidence * 100))%)")
                } else if (expected == "noise" || expected == "informational") && predictedIsSensitive {
                    metrics.falsePositives += 1
                    print("📖 [Index \(index)] FALSE BLOCK: Expected \(expected), Got \(prediction) (\(String(format: "%.1f", confidence * 100))%)")
                } else {
                    print("❌ [Index \(index)] MISCLASS: Expected \(expected), Got \(prediction) (\(String(format: "%.1f", confidence * 100))%)")
                }
            }
        }
        
        // Output results
        print("\n📊 RESULTS FOR \(name.uppercased())")
        print("✅ Accuracy:      \(String(format: "%.2f", metrics.accuracy))%")
        print("⏱️ Avg Latency:   \(String(format: "%.2f", metrics.avgLatency)) ms")
        print("⏱️ P50 Latency:   \(String(format: "%.2f", metrics.p50)) ms")
        print("⏱️ P90 Latency:   \(String(format: "%.2f", metrics.p90)) ms")
        print("⏱️ P99 Latency:   \(String(format: "%.2f", metrics.p99)) ms")
        print("🔴 False Negs (Leaks):    \(metrics.falseNegatives)")
        print("🟡 False Pos (Blocks):    \(metrics.falsePositives)")
        
        print("\n--- Per-Class Performance Matrix ---")
        print("LABEL               | PRECISION | RECALL    | F1 SCORE  | SUPPORT")
        print("--------------------|-----------|-----------|-----------|--------")
        for label in targetClasses.sorted() {
            let m = classStats[label] ?? ClassMetrics()
            let pStr = String(format: "%.4f", m.precision)
            let rStr = String(format: "%.4f", m.recall)
            let fStr = String(format: "%.4f", m.f1)
            let sStr = String(m.total)
            print("\(label.padding(toLength: 19, withPad: " ", startingAt: 0)) | \(pStr.padding(toLength: 9, withPad: " ", startingAt: 0)) | \(rStr.padding(toLength: 9, withPad: " ", startingAt: 0)) | \(fStr.padding(toLength: 9, withPad: " ", startingAt: 0)) | \(sStr)")
        }
        
    } catch {
        print("❌ Error reading or parsing dataset: \(error.localizedDescription)")
    }
}


let projectRoot = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let modelURL = projectRoot.appendingPathComponent("models/PrivacyGatekeeper.mlmodel")
let mainDataURL = projectRoot.appendingPathComponent("data/processed/training_set.json")
let stagingTestURL = projectRoot.appendingPathComponent("data/staging_test_set.json")

print("🚀 Starting Strategic Verification Substrate...")
print("📍 Model: \(modelURL.path)")

do {
    // Compile and Load Model
    print("⚙️ Compiling model substrate...")
    let compiledURL = try MLModel.compileModel(at: modelURL)
    let model = try NLModel(contentsOf: compiledURL)
    
    // Evaluate Main Training Set
    evaluateDataset(model: model, fileURL: mainDataURL, name: "Main Training Set")
    
    // Evaluate Staging Test Set (Real-world holdout)
    if FileManager.default.fileExists(atPath: stagingTestURL.path) {
        evaluateDataset(model: model, fileURL: stagingTestURL, name: "Staging Holdout Test Set")
    } else {
        print("\nℹ️ Staging test set not found at \(stagingTestURL.path)")
    }
    
} catch {
    print("💥 Fatal Substrate Error: \(error)")
    exit(1)
}
