import XCTest
import NaturalLanguage
@testable import AleteGateKit

final class AleteGateKitTests: XCTestCase {
    override func setUpWithError() throws {
        try super.setUpWithError()
        
        if #available(iOS 17.0, macOS 14.0, *) {
            if let embedding = NLContextualEmbedding(language: .english) {
                if !embedding.hasAvailableAssets {
                    print("⏳ Alete Gate Tests: Contextual embedding assets not found. Requesting download...")
                    let semaphore = DispatchSemaphore(value: 0)
                    embedding.requestAssets { result, error in
                        if let error = error {
                            print("⚠️ Alete Gate Tests: Failed to download assets: \(error)")
                        } else {
                            print("✅ Alete Gate Tests: Assets download completed with status: \(result == .available ? "available" : "not available")")
                        }
                        semaphore.signal()
                    }
                    // Wait up to 120 seconds for the download in CI
                    _ = semaphore.wait(timeout: .now() + 120)
                } else {
                    print("✅ Alete Gate Tests: Contextual embedding assets are already available.")
                }
            }
        }
    }
    
    func testGateClassifierInitialization() throws {
        let agent = try GateClassifier()
        XCTAssertNotNil(agent)
    }
    
    func testClassification() throws {
        let agent = try GateClassifier()
        
        let portalTokens = "structFormStart structLabel Username structInputText Username EnterUsername structButton Login structFormEnd"
        let portalResult = agent.classify(tokens: portalTokens)
        print("🔍 PORTAL TOKENS CLASSIFIED AS: \(portalResult.label.rawValue) (Confidence: \(portalResult.confidence))")
        XCTAssertNotEqual(portalResult.label, .unknown)
        XCTAssertGreaterThan(portalResult.confidence, 0.0)
        
        let articleTokens = "structLinkElement sysHeader1 Mathematicsisoutthere sysHeader2 SergiuKlainermanspentyearsprov structLinkElement!structLinkElementAbstractdigitalillus structButtonSaveessayMathematics Mathematics Sergiu Klainerman Steve Nadis sysHeader2 Popularthismonth structLinkElement!structLinkElementTwopeopleonatrainone structButtonSaveessayStories Does Stripped Flora Champy structLinkElement!structLinkElementAgroupofrunnersonaro structButtonSaveessaySports The Ethiopian One The Michael Crawley Geoff Burns structLinkElement!structLinkElementAbustlingoutdoormark structButtonSaveessayDemography The Indians Genetic India Kiran Kumbhar structLinkElement!structLinkElementAbstractdigitalartwo structButtonSaveessayQuantum Reality Particles Universe Felix Flicker structLinkElement!structLinkElementPaintingoffourmensit structButtonSaveessayProgress Gen Emily Herring structLinkElement!structLinkElementIllustrationofastyli structButtonSavevideoStories The Indian structLinkElement!structLinkElementAcolourfulgraffitico structButtonSaveessayHuman Rights Talk Attiya Waris"
        let articleResult = agent.classify(tokens: articleTokens, includeScores: true)
        print("🔍 ARTICLE TOKENS CLASSIFIED AS: \(articleResult.label.rawValue) (Confidence: \(articleResult.confidence))")
        XCTAssertEqual(articleResult.label, .informational)
        XCTAssertNotNil(articleResult.scores)
        XCTAssertEqual(articleResult.scores?[.informational], articleResult.confidence)
    }

}
