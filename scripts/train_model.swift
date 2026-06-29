import Foundation
import CreateML

// Ensure we have the necessary file paths
let projectRoot = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let trainingDataPath = projectRoot.appendingPathComponent("data/processed/training_set_flat.json")
let modelOutputPath = projectRoot.appendingPathComponent("models/PrivacyGatekeeper.mlmodel")

print("🚀 Alete Gate: Starting training pipeline with data from: \(trainingDataPath.path)")

do {
    // 1. Load Data
    let trainingData = try MLDataTable(contentsOf: trainingDataPath)
    
    // 2. Train Classifier (Transfer Learning with BERT)
    let classifier: MLTextClassifier
    if #available(macOS 14.0, *) {
        print("⚙️ Training with NLContextualEmbedding transfer learning substrate (BERT)...")
        let parameters = MLTextClassifier.ModelParameters(
            algorithm: .transferLearning(.bertEmbedding, revision: 1)
        )
        classifier = try MLTextClassifier(
            trainingData: trainingData,
            textColumn: "text",
            labelColumn: "label",
            parameters: parameters
        )
    } else {
        print("⚠️ Warning: NLContextualEmbedding is not supported on this macOS version. Falling back to MaxEnt...")
        classifier = try MLTextClassifier(
            trainingData: trainingData,
            textColumn: "text",
            labelColumn: "label"
        )
    }
    
    // 3. Metrics
    let trainingAccuracy = (1.0 - classifier.trainingMetrics.classificationError) * 100
    let validationAccuracy = (1.0 - classifier.validationMetrics.classificationError) * 100
    
    print("\n--- 📊 Substrate Training Complete ---")
    print("✅ Training Accuracy:   \(String(format: "%.2f", trainingAccuracy))%")
    print("✅ Validation Accuracy: \(String(format: "%.2f", validationAccuracy))%")
    
    // 4. Export Model
    let metadata = MLModelMetadata(
        author: "Stoyan Dimitrov <https://github.com/StoyanD>",
        shortDescription: "Alete PrivacyGatekeeper: Edge-based structural text classifier.",
        version: "1.1.0"
    )
    
    // Remove existing model if it exists
    if FileManager.default.fileExists(atPath: modelOutputPath.path) {
        try FileManager.default.removeItem(at: modelOutputPath)
    }
    
    try classifier.write(to: modelOutputPath, metadata: metadata)
    
    print("💎 Success: Sovereign model substrate exported to \(modelOutputPath.path)")
} catch {
    print("Error during training: \(error)")
    exit(1)
}
