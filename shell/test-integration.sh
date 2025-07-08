#!/bin/bash

echo "=== Gemini Shell End-to-End Integration Test ==="
echo

# Test 1: Basic shell commands
echo "Test 1: Basic shell commands"
echo "pwd" | ./target/release/gemini-shell
echo "echo Hello from Rust shell" | ./target/release/gemini-shell
echo

# Test 2: Gemini integration with 'g' prefix
echo "Test 2: Gemini AI integration"
echo "g say hello in one word" | ./target/release/gemini-shell
echo

# Test 3: Command analysis with '_' prefix
echo "Test 3: Command analysis"
echo "_ ls -la" | ./target/release/gemini-shell
echo

# Test 4: Response piping with %%
echo "Test 4: Response piping"
echo -e "g echo 'Hello from AI'\necho %%" | ./target/release/gemini-shell
echo

# Test 5: Built-in commands
echo "Test 5: Built-in commands"
echo -e "alias ll='ls -l'\nalias" | ./target/release/gemini-shell
echo

echo "=== Integration test complete ==="