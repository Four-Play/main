// swift-tools-version: 5.9
import PackageDescription

// Normally managed by `npx cap sync ios`, but cap-sync was not picking up
// the camera plugin reliably and the iOS build kept shipping without it
// (Apple review hit "camera plugin is not implemented on iOS"). Adding the
// dependency by hand so it's locked in git and not reliant on cap-sync.
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.3.0"),
        .package(name: "CapacitorCamera", path: "../../../node_modules/@capacitor/camera")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CapacitorCamera", package: "CapacitorCamera")
            ]
        )
    ]
)
