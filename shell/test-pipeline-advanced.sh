#!/bin/bash

echo "=== Testing Advanced Pipeline Features ==="
echo

# Test proper pipeline functionality
echo "Test 1: Echo and count lines"
echo "echo -e 'line1\nline2\nline3' | wc -l" | ./target/release/gemini-shell 2>&1 | tail -5
echo

echo "Test 2: Multiple grep stages"
echo "echo -e 'hello world\nhello rust\ngoodbye world' | grep hello | grep rust" | ./target/release/gemini-shell 2>&1 | tail -5
echo

echo "Test 3: Process listing pipeline"
echo "ps aux | head -10 | tail -5 | wc -l" | ./target/release/gemini-shell 2>&1 | tail -5
echo

echo "Test 4: File operations pipeline"
echo "ls -1 | head -5 | sort -r" | ./target/release/gemini-shell 2>&1 | tail -10
echo

echo "Test 5: Complex data processing"
echo "echo -e '3\n1\n4\n1\n5\n9\n2\n6' | sort -n | uniq" | ./target/release/gemini-shell 2>&1 | tail -15
echo

echo "=== Pipeline tests complete ==="