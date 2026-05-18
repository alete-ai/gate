import Foundation
import CreateML

// Ensure we have the necessary file paths
let projectRoot = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let trainingDataPath = projectRoot.appendingPathComponent("data/processed/training_set.csv")
let modelOutputPath = projectRoot.appendingPathComponent("models/PrivacyGatekeeper.mlpackage")

print("Starting training with data from: \(trainingDataPath.path)")

do {
    // 1. Load Data
    let trainingData = try MLDataTable(contentsOf: trainingDataPath)
    
    // 2. Train Classifier (Maximum Entropy)
    // CreateML defaults to MaxEnt for text classification if not specified otherwise
    let classifier = try MLTextClassifier(trainingData: trainingData, textColumn: "text", labelColumn: "label")
    
    // 3. Metrics
    let trainingAccuracy = (1.0 - classifier.trainingMetrics.classificationError) * 100
    let validationAccuracy = (1.0 - classifier.validationMetrics.classificationError) * 100
    
    print("--- Training Complete ---")
    print("Training Accuracy: \(String(format: "%.2f", trainingAccuracy))%")
    print("Validation Accuracy: \(String(format: "%.2f", validationAccuracy))%")
    
    // 4. Export Model
    let metadata = MLModelMetadata(
        author: "Stoyan Dimitrov <https://github.com/StoyanD>",
        shortDescription: "Alete PrivacyGatekeeper Structural Text Classifier",
        version: "1.0"
    )
    
    // Remove existing model if it exists
    if FileManager.default.fileExists(atPath: modelOutputPath.path) {
        try FileManager.default.removeItem(at: modelOutputPath)
    }
    
    try classifier.write(to: modelOutputPath, metadata: metadata)
    
    print("Success: Model exported to \(modelOutputPath.path)")
} catch {
    print("Error during training: \(error)")
    exit(1)
}
