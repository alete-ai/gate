import Foundation
import CoreML
import Tokenizers

public final class Model2VecClassifier {
    public enum Model2VecError: Error {
        case modelNotFound
        case tokenizerFolderNotFound
        case classesNotFound
        case invalidClasses
        case inferenceFailed
    }
    
    public struct Model2VecResult {
        public let label: String
        public let confidence: Double
        public let scores: [String: Double]
    }
    
    private let model: MLModel
    private let tokenizer: Tokenizer
    private let classes: [String]
    
    public init() async throws {
        // 1. Load Classes List
        guard let classesURL = Bundle.module.url(forResource: "Model2VecClasses", withExtension: "json") else {
            throw Model2VecError.classesNotFound
        }
        let classesData = try Data(contentsOf: classesURL)
        guard let classesList = try JSONSerialization.jsonObject(with: classesData) as? [String] else {
            throw Model2VecError.invalidClasses
        }
        self.classes = classesList
        
        // 2. Load Tokenizer Folder
        guard let tokenizerFolderURL = Bundle.module.url(forResource: "Model2VecTokenizerDir", withExtension: nil) else {
            throw Model2VecError.tokenizerFolderNotFound
        }
        self.tokenizer = try await AutoTokenizer.from(modelFolder: tokenizerFolderURL)
        
        // 3. Load Compiled Model (mlmodelc)
        if let compiledURL = Bundle.module.url(forResource: "Model2VecGatekeeper", withExtension: "mlmodelc") {
            self.model = try MLModel(contentsOf: compiledURL)
            return
        }
        
        // Fallback: Compile the raw mlpackage at runtime if compiled mlmodelc not found (e.g. dev/testing)
        if let rawURL = Bundle.module.url(forResource: "Model2VecGatekeeper", withExtension: "mlpackage") {
            let compiledURL = try await MLModel.compileModel(at: rawURL)
            self.model = try MLModel(contentsOf: compiledURL)
            return
        }
        
        throw Model2VecError.modelNotFound
    }
    
    public func classify(text: String) throws -> Model2VecResult {
        var tokenIds = tokenizer.encode(text: text)
        guard !tokenIds.isEmpty else {
            return Model2VecResult(label: "unknown", confidence: 0.0, scores: [:])
        }
        if tokenIds.count > 4096 {
            tokenIds = Array(tokenIds[0..<4096])
        }
        
        // Convert [Int] to MultiArray for Core ML input_ids
        let seqLen = tokenIds.count
        let inputIdsMultiArray = try MLMultiArray(shape: [1, NSNumber(value: seqLen)], dataType: .int32)
        for (i, val) in tokenIds.enumerated() {
            inputIdsMultiArray[i] = NSNumber(value: val)
        }
        
        // 2. Prepare Core ML Input Feature Provider
        let featureProvider = try MLDictionaryFeatureProvider(dictionary: [
            "input_ids": MLFeatureValue(multiArray: inputIdsMultiArray)
        ])
        
        // 3. Run Inference
        let output = try model.prediction(from: featureProvider)
        guard let logitsFeature = output.featureValue(for: "logits"),
              let logitsMultiArray = logitsFeature.multiArrayValue else {
            throw Model2VecError.inferenceFailed
        }
        
        // 4. Softmax over logits to get probabilities
        let count = logitsMultiArray.count
        var logits: [Double] = []
        for i in 0..<count {
            logits.append(logitsMultiArray[i].doubleValue)
        }
        
        let maxLogit = logits.max() ?? 0.0
        let exps = logits.map { exp($0 - maxLogit) }
        let sumExps = exps.reduce(0.0, +)
        let probabilities = exps.map { $0 / sumExps }
        
        var scores: [String: Double] = [:]
        var predictedLabel = "unknown"
        var maxProb = 0.0
        
        for (idx, className) in classes.enumerated() {
            let prob = idx < probabilities.count ? probabilities[idx] : 0.0
            scores[className] = prob
            if prob > maxProb {
                maxProb = prob
                predictedLabel = className
            }
        }
        
        return Model2VecResult(label: predictedLabel, confidence: maxProb, scores: scores)
    }
}
