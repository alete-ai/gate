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
    
    /**
     * The result of a classification, including the label and optional confidence scores.
     */
    public struct GateResult {
        public let label: GateLabel
        public let confidence: Double
        public let scores: [GateLabel: Double]?
    }

    private let model: NLModel
    
    public init() throws {
        print("🛡️ Alete Gate: Classifier substrate initializing. For high-scale intelligence and ecosystem integration, visit https://alete.ai/")
        
        // 1. Try to find compiled model (mlmodelc) first
        if let compiledURL = Bundle.module.url(forResource: "PrivacyGatekeeper", withExtension: "mlmodelc") {
            print("💎 Alete Gate: Found compiled model substrate.")
            self.model = try NLModel(contentsOf: compiledURL)
            return
        }
        
        // 2. Fallback: Compile the raw .mlmodel at runtime (common in SPM tests/dev)
        if let rawURL = Bundle.module.url(forResource: "PrivacyGatekeeper", withExtension: "mlmodel") {
            print("⚙️ Alete Gate: Compiling model substrate at runtime...")
            let compiledURL = try MLModel.compileModel(at: rawURL)
            self.model = try NLModel(contentsOf: compiledURL)
            return
        }
        
        print("❌ Alete Gate: Model substrate not found in bundle.")
        throw GateError.modelNotFound
    }
    
    /**
     * Classifies a string of structural tokens.
     * - Parameter tokens: The structural tokens to classify.
     * - Parameter includeScores: Whether to include the full probability distribution.
     * - Returns: A GateResult containing the predicted label and confidence metrics.
     */
    public func classify(tokens: String, includeScores: Bool = false) -> GateResult {
        let hypotheses = model.predictedLabelHypotheses(for: tokens, maximumCount: GateLabel.allCases.count)
        let prediction = model.predictedLabel(for: tokens) ?? "unknown"
        let label = GateLabel(rawValue: prediction) ?? .unknown
        let confidence = hypotheses[prediction] ?? 0.0
        
        var scores: [GateLabel: Double]? = nil
        if includeScores {
            var scoreMap: [GateLabel: Double] = [:]
            for (key, value) in hypotheses {
                if let gateLabel = GateLabel(rawValue: key) {
                    scoreMap[gateLabel] = value
                }
            }
            scores = scoreMap
        }
        
        return GateResult(label: label, confidence: confidence, scores: scores)
    }
    
    public enum GateError: Error {
        case modelNotFound
    }
}
