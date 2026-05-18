// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "GateClassifierKit",
    platforms: [
        .iOS(.v16),
        .macOS(.v13)
    ],
    products: [
        .library(
            name: "GateClassifierKit",
            targets: ["GateClassifierKit"]),
    ],
    targets: [
        .target(
            name: "GateClassifierKit",
            dependencies: [],
            resources: [
                .process("Resources/PrivacyGatekeeper.mlmodel")
            ]
        ),
        .testTarget(
            name: "GateClassifierKitTests",
            dependencies: ["GateClassifierKit"]),
    ]
)
