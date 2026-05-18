#!/bin/bash

# AleteClassifier XCFramework Build Script
# Usage: ./scripts/build_xcframework.sh

set -e

FRAMEWORK_NAME="AleteGateKit"
PACKAGE_PATH="ios/AleteGateKit"
OUTPUT_DIR="dist/ios"
ARCHIVE_DIR="${OUTPUT_DIR}/archives"

echo "🚀 Starting XCFramework build for ${FRAMEWORK_NAME}..."

# 1. Clean and Prepare
rm -rf "${OUTPUT_DIR}"
mkdir -p "${ARCHIVE_DIR}"

# 2. Archive for iOS Device
echo "📦 Archiving for iOS Device..."
xcodebuild archive \
    -workspace "Package.swift" \
    -scheme "${FRAMEWORK_NAME}" \
    -destination "generic/platform=iOS" \
    -archivePath "${ARCHIVE_DIR}/${FRAMEWORK_NAME}-iOS" \
    SKIP_INSTALL=NO \
    BUILD_LIBRARY_FOR_DISTRIBUTION=YES \
    -project "${PACKAGE_PATH}" || {
        # Fallback for pure SPM package without .xcodeproj
        cd "${PACKAGE_PATH}"
        xcodebuild archive \
            -scheme "${FRAMEWORK_NAME}" \
            -destination "generic/platform=iOS" \
            -archivePath "../../${ARCHIVE_DIR}/${FRAMEWORK_NAME}-iOS" \
            SKIP_INSTALL=NO \
            BUILD_LIBRARY_FOR_DISTRIBUTION=YES
        cd - > /dev/null
    }

# 3. Archive for iOS Simulator
echo "📦 Archiving for iOS Simulator..."
cd "${PACKAGE_PATH}"
xcodebuild archive \
    -scheme "${FRAMEWORK_NAME}" \
    -destination "generic/platform=iOS Simulator" \
    -archivePath "../../${ARCHIVE_DIR}/${FRAMEWORK_NAME}-iOS_Simulator" \
    SKIP_INSTALL=NO \
    BUILD_LIBRARY_FOR_DISTRIBUTION=YES
cd - > /dev/null

# 4. Create XCFramework
echo "🏗️ Creating XCFramework..."
FRAMEWORK_RELATIVE_PATH="Products/usr/local/lib/${FRAMEWORK_NAME}.framework"

xcodebuild -create-xcframework \
    -framework "${ARCHIVE_DIR}/${FRAMEWORK_NAME}-iOS.xcarchive/${FRAMEWORK_RELATIVE_PATH}" \
    -framework "${ARCHIVE_DIR}/${FRAMEWORK_NAME}-iOS_Simulator.xcarchive/${FRAMEWORK_RELATIVE_PATH}" \
    -output "${OUTPUT_DIR}/${FRAMEWORK_NAME}.xcframework"

# 5. Zip the XCFramework
echo "🗜️ Zipping XCFramework..."
cd "${OUTPUT_DIR}"
zip -r "${FRAMEWORK_NAME}.xcframework.zip" "${FRAMEWORK_NAME}.xcframework"

# 6. Compute Checksum
echo "🔐 Computing Checksum..."
CHECKSUM=$(swift package compute-checksum "${FRAMEWORK_NAME}.xcframework.zip")
echo "------------------------------------------------"
echo "✅ Build Complete!"
echo "📦 Asset: ${OUTPUT_DIR}/${FRAMEWORK_NAME}.xcframework.zip"
echo "🔐 Checksum: ${CHECKSUM}"
echo "------------------------------------------------"

# Save checksum for CI/CD usage
echo "${CHECKSUM}" > "checksum.txt"
