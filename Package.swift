// swift-tools-version:5.5
import PackageDescription

let package = Package(
    name: "AleteGate",
    platforms: [
        .iOS(.v14),
        .macOS(.v11)
    ],
    products: [
        .library(
            name: "AleteGateKit",
            type: .static,
            targets: ["AleteGateKit"]),
    ],
    dependencies: [
        // Zero dependencies for high structural resilience
    ],
    targets: [
        .target(
            name: "AleteGateKit",
            path: "ios/AleteGateKit/Sources/AleteGateKit",
            resources: [
                .process("Resources/PrivacyGatekeeper.mlmodel")
            ]
        ),
        .testTarget(
            name: "AleteGateKitTests",
            dependencies: ["AleteGateKit"],
            path: "ios/AleteGateKit/Tests/AleteGateKitTests"
        )
    ]
)
