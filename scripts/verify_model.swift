import Foundation
import CoreML
import NaturalLanguage

// Swift translation of JS classifier input builder
func buildClassifierInput(urlHost: String?, urlPathKeywords: [String]?, title: String?, tokens: String) -> String {
    var combined = ""
    
    if let host = urlHost, !host.isEmpty {
        let cleanHost = host.lowercased().trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: "www.", with: "")
        if !cleanHost.isEmpty {
            combined += "urlHost_\(cleanHost) "
        }
    }
    
    if let pathKeywords = urlPathKeywords, !pathKeywords.isEmpty {
        combined += pathKeywords.map { "urlPath_\($0)" }.joined(separator: " ") + " "
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
                combined += words.map { "title_\($0)" }.joined(separator: " ") + " "
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
        var labelMetrics: [String: Metric] = [:]
        
        print("🔍 Running inference on \(json.count) samples...")
        
        for (index, sample) in json.enumerated() {
            let structural = sample["structural"] as? String ?? ""
            let metadata = sample["metadata"] as? [String: Any] ?? [:]
            let expected = sample["label"] as? String ?? "unknown"
            
            let title = metadata["title"] as? String ?? sample["title"] as? String ?? ""
            let urlHost = metadata["urlHost"] as? String ?? sample["urlHost"] as? String ?? ""
            let urlPathKeywords = metadata["urlPathKeywords"] as? [String] ?? sample["urlPathKeywords"] as? [String] ?? []
            
            // Truncate structural tokens
            let truncatedStructural = String(structural.prefix(2000))
            
            // Combined text format matching Create ML input
            let combinedText = buildClassifierInput(urlHost: urlHost, urlPathKeywords: urlPathKeywords, title: title, tokens: truncatedStructural)
            
            let start = CFAbsoluteTimeGetCurrent()
            let hypotheses = model.predictedLabelHypotheses(for: combinedText, maximumCount: 3)
            let prediction = model.predictedLabel(for: combinedText) ?? "unknown"
            let confidence = hypotheses[prediction] ?? 0.0
            let latency = CFAbsoluteTimeGetCurrent() - start
            
            metrics.total += 1
            metrics.totalLatency += latency
            
            if labelMetrics[expected] == nil { labelMetrics[expected] = Metric() }
            labelMetrics[expected]?.total += 1
            
            if prediction == expected {
                metrics.correct += 1
                labelMetrics[expected]?.correct += 1
            } else {
                // Track failures
                if expected == "sensitive_portal" {
                    if prediction == "digestible_article" {
                        metrics.falseNegatives += 1
                    }
                    print("🚨 [Index \(index)] PORTAL LEAK: Expected \(expected), Got \(prediction) (\(String(format: "%.1f", confidence * 100))%)")
                } else if expected == "digestible_article" {
                    if prediction == "sensitive_portal" {
                        metrics.falsePositives += 1
                    }
                    print("📖 [Index \(index)] FALSE BLOCK: Expected \(expected), Got \(prediction) (\(String(format: "%.1f", confidence * 100))%)")
                }
            }
        }
        
        // Output results
        print("\n📊 RESULTS FOR \(name.uppercased())")
        print("✅ Accuracy:      \(String(format: "%.2f", metrics.accuracy))%")
        print("⏱️ Avg Latency:   \(String(format: "%.2f", metrics.avgLatency)) ms")
        print("🔴 False Negs (Leaks):    \(metrics.falseNegatives)")
        print("🟡 False Pos (Blocks):    \(metrics.falsePositives)")
        
        print("\n--- Per-Label Accuracy ---")
        for (label, m) in labelMetrics {
            print("🏷️ \(label.padding(toLength: 20, withPad: " ", startingAt: 0)): \(String(format: "%.2f", m.accuracy))% (\(m.correct)/\(m.total))")
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
