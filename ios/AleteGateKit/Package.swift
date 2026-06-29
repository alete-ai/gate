// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "AleteGateKit",
    platforms: [
        .iOS(.v18),
        .macOS(.v15)
    ],
    products: [
        .library(
            name: "AleteGateKit",
            type: .dynamic,
            targets: ["AleteGateKit"]),
    ],
    dependencies: [
        .package(url: "https://github.com/huggingface/swift-transformers", from: "1.3.0")
    ],
    targets: [
        .target(
            name: "AleteGateKit",
            dependencies: [
                .product(name: "Tokenizers", package: "swift-transformers")
            ],
            resources: [
                .process("Resources/PrivacyGatekeeper.mlmodel"),
                .copy("Resources/Model2VecGatekeeper.mlpackage"),
                .copy("Resources/Model2VecTokenizerDir"),
                .process("Resources/Model2VecClasses.json")
            ]
        ),
        .testTarget(
            name: "AleteGateKitTests",
            dependencies: ["AleteGateKit"]),
    ]
)
