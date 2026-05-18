import Foundation
import CoreML
import NaturalLanguage

/**
 * The Sovereign Gate Classifier.
 * Handles on-device classification using the native PrivacyGatekeeper model.
 */
public final class GateClassifier {
    public enum GateLabel: String, CaseIterable {
        case sensitivePortal = "sensitive_portal"
        case digestibleArticle = "digestible_article"
        case noise = "noise"
        case unknown = "unknown"
    }
    
    private let model: NLModel
    
    public init() throws {
        // 1. Try to find compiled model (mlmodelc) first
        if let compiledURL = Bundle.module.url(forResource: "PrivacyGatekeeper", withExtension: "mlmodelc") {
            print("💎 GateClassifier: Found compiled model substrate.")
            self.model = try NLModel(contentsOf: compiledURL)
            return
        }
        
        // 2. Fallback: Compile the raw .mlmodel at runtime (common in SPM tests/dev)
        if let rawURL = Bundle.module.url(forResource: "PrivacyGatekeeper", withExtension: "mlmodel") {
            print("⚙️ GateClassifier: Compiling model substrate at runtime...")
            let compiledURL = try MLModel.compileModel(at: rawURL)
            self.model = try NLModel(contentsOf: compiledURL)
            return
        }
        
        print("❌ GateClassifier: Model substrate not found in bundle.")
        throw GateError.modelNotFound
    }
    
    /**
     * Classifies a string of structural tokens.
     */
    public func classify(tokens: String) -> GateLabel {
        let prediction = model.predictedLabel(for: tokens) ?? "unknown"
        return GateLabel(rawValue: prediction) ?? .unknown
    }
    
    public enum GateError: Error {
        case modelNotFound
    }
}
