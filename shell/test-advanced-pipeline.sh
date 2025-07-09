#!/bin/bash

echo "=== Testing Advanced Pipeline Features ==="
echo

# Test 1: Basic pipeline
echo "Test 1: Basic pipeline (echo | grep | wc)"
echo "echo -e 'apple\nbanana\napricot' | grep '^a' | wc -l" | ./target/release/gemini-shell
echo

# Test 2: Complex pipeline with multiple stages
echo "Test 2: Complex pipeline (cat | grep | sort | uniq)"
echo "Creating test file..."
echo -e "apple\nbanana\napple\ncherry\napricot\nbanana" > /tmp/fruits.txt
echo "cat /tmp/fruits.txt | sort | uniq -c | sort -nr" | ./target/release/gemini-shell
echo

# Test 3: Pipeline with redirection
echo "Test 3: Pipeline with output redirection"
echo "ls -la | grep -E '\.rs$' | head -5 > /tmp/rust_files.txt && cat /tmp/rust_files.txt" | ./target/release/gemini-shell
echo

# Test 4: Long pipeline
echo "Test 4: Long pipeline (ps | grep | awk | sort)"
echo "ps aux | grep -v grep | grep shell | awk '{print \$2, \$11}' | sort -n" | ./target/release/gemini-shell
echo

# Test 5: Pipeline with Gemini
echo "Test 5: Pipeline with Gemini command"
echo "g list 5 programming languages | grep -i 'script'" | ./target/release/gemini-shell
echo

# Cleanup
rm -f /tmp/fruits.txt /tmp/rust_files.txt

echo "=== Advanced pipeline tests complete ==="