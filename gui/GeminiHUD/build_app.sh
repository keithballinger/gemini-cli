#!/bin/bash

# Build proper macOS app bundle for URL scheme registration

APP_NAME="GeminiHUD"
BUILD_DIR=".build/debug"
APP_BUNDLE="$BUILD_DIR/$APP_NAME.app"
CONTENTS_DIR="$APP_BUNDLE/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"
RESOURCES_DIR="$CONTENTS_DIR/Resources"

echo "Building Swift package..."
swift build

if [ $? -ne 0 ]; then
    echo "Swift build failed"
    exit 1
fi

echo "Creating app bundle structure..."

# Remove existing bundle
rm -rf "$APP_BUNDLE"

# Create bundle directories
mkdir -p "$MACOS_DIR"
mkdir -p "$RESOURCES_DIR"

# Copy executable
cp "$BUILD_DIR/$APP_NAME" "$MACOS_DIR/"

# Copy and process Info.plist
sed -e 's/$(EXECUTABLE_NAME)/GeminiHUD/g' \
    -e 's/$(DEVELOPMENT_LANGUAGE)/en/g' \
    -e 's/$(MACOSX_DEPLOYMENT_TARGET)/13.0/g' \
    "Sources/Resources/Info.plist" > "$CONTENTS_DIR/Info.plist"

# Make executable
chmod +x "$MACOS_DIR/$APP_NAME"

echo "App bundle created at: $APP_BUNDLE"
echo ""
echo "To register URL scheme, run:"
echo "open -a '$APP_BUNDLE'"
echo ""
echo "Then test with:"
echo "open 'gemini://launch/Users/keithballinger/Desktop'"