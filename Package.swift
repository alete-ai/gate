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
            targets: ["AleteGateKit"]),
    ],
    dependencies: [
        // Zero dependencies for high structural resilience
    ],
    targets: [
        .target(
            name: "AleteGateKit",
            path: "ios/Gate/Sources/Gate",
            resources: [
                // .process("Resources")
            ]
        ),
        .testTarget(
            name: "AleteGateKitTests",
            dependencies: ["AleteGateKit"],
            path: "ios/Gate/Tests/GateTests",
            resources: [
                // .process("Resources")
            ]
        )
    ]
)
