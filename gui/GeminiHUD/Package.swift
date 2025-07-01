// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "GeminiHUD",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(
            name: "GeminiHUD",
            targets: ["GeminiHUD"]
        )
    ],
    dependencies: [
        // Temporarily remove dependencies to get basic build working
        // .package(url: "https://github.com/realm/SwiftLint", from: "0.54.0"),
        // .package(url: "https://github.com/sparkle-project/Sparkle", from: "2.5.0")
    ],
    targets: [
        .executableTarget(
            name: "GeminiHUD",
            dependencies: [
                // .product(name: "Sparkle", package: "Sparkle")
            ],
            path: "Sources"
            // resources: [
            //     .process("Resources")
            // ]
            // plugins: [
            //     .plugin(name: "SwiftLintPlugin", package: "SwiftLint")
            // ]
        ),
        .testTarget(
            name: "GeminiHUDTests",
            dependencies: ["GeminiHUD"],
            path: "Tests/UnitTests"
        ),
        .testTarget(
            name: "GeminiHUDUITests",
            dependencies: ["GeminiHUD"],
            path: "Tests/UITests"
        )
    ]
)