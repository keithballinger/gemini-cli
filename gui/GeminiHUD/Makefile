.PHONY: all build test clean lint coverage run debug release

# Build configurations
CONFIG_DEBUG = debug
CONFIG_RELEASE = release
SCHEME = GeminiHUD
DESTINATION = 'platform=macOS'

# Directories
BUILD_DIR = .build
COVERAGE_DIR = coverage

all: lint build test

build:
	@echo "Building GeminiHUD..."
	@swift build

test:
	@echo "Running tests..."
	@swift test

clean:
	@echo "Cleaning build artifacts..."
	@rm -rf $(BUILD_DIR)
	@rm -rf $(COVERAGE_DIR)
	@rm -rf .swiftpm

lint:
	@echo "Running SwiftLint..."
	@swift package plugin swiftlint

coverage:
	@echo "Generating test coverage..."
	@swift test --enable-code-coverage
	@xcrun llvm-cov report \
		.build/debug/GeminiHUDPackageTests.xctest/Contents/MacOS/GeminiHUDPackageTests \
		-instr-profile=.build/debug/codecov/default.profdata \
		-ignore-filename-regex=".build|Tests"

run: build
	@echo "Running GeminiHUD..."
	@.build/debug/GeminiHUD

debug:
	@echo "Building debug configuration..."
	@xcodebuild -scheme $(SCHEME) -configuration Debug build

release:
	@echo "Building release configuration..."
	@xcodebuild -scheme $(SCHEME) -configuration Release build

# Xcode specific commands
xcode:
	@echo "Generating Xcode project..."
	@swift package generate-xcodeproj

format:
	@echo "Formatting code..."
	@swift-format -i -r Sources/ Tests/

# Installation
install: release
	@echo "Installing GeminiHUD..."
	@cp .build/release/GeminiHUD /usr/local/bin/

uninstall:
	@echo "Uninstalling GeminiHUD..."
	@rm -f /usr/local/bin/GeminiHUD

# CI/CD helpers
ci-test:
	@swift test --parallel

ci-build:
	@swift build -c release

# Help
help:
	@echo "Available targets:"
	@echo "  make build     - Build the project"
	@echo "  make test      - Run tests"
	@echo "  make clean     - Clean build artifacts"
	@echo "  make lint      - Run SwiftLint"
	@echo "  make coverage  - Generate test coverage report"
	@echo "  make run       - Build and run the app"
	@echo "  make debug     - Build debug configuration"
	@echo "  make release   - Build release configuration"
	@echo "  make install   - Install to /usr/local/bin"
	@echo "  make help      - Show this help message"