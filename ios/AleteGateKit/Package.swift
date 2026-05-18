// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "AleteGateKit",
    platforms: [
        .iOS(.v16),
        .macOS(.v13)
    ],
    products: [
        .library(
            name: "AleteGateKit",
            targets: ["AleteGateKit"]),
    ],
    targets: [
        .target(
            name: "AleteGateKit",
            dependencies: [],
            resources: [
                .process("Resources/PrivacyGatekeeper.mlmodel")
            ]
        ),
        .testTarget(
            name: "AleteGateKitTests",
            dependencies: ["AleteGateKit"]),
    ]
)
