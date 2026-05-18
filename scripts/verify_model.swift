import Foundation
import CoreML
import NaturalLanguage

let projectRoot = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let modelURL = projectRoot.appendingPathComponent("models/PrivacyGatekeeper.mlmodel")

print("Verifying model at: \(modelURL.path)")

do {
    // 1. Compile and load the model
    print("Compiling model...")
    let compiledURL = try MLModel.compileModel(at: modelURL)
    let model = try NLModel(contentsOf: compiledURL)
    
    // 2. Test Samples (Tokens)
    let testSamples: [(text: String, expected: String)] = [
        (
            text: "structFormStart structLabel Username structInputText Username EnterUsername structButton Login structFormEnd",
            expected: "sensitive_portal"
        ),
        (
            text: "sysHeader1 BreakingNews This is a story about privacy",
            expected: "digestible_article"
        )
    ]
    
    print("--- Running Verification ---")
    for sample in testSamples {
        let prediction = model.predictedLabel(for: sample.text) ?? "unknown"
        let status = (prediction == sample.expected) ? "✅ PASS" : "❌ FAIL"
        print("\(status) | Input: \(sample.text.prefix(30))... | Expected: \(sample.expected) | Got: \(prediction)")
    }
    
} catch {
    print("Error during verification: \(error)")
    exit(1)
}
