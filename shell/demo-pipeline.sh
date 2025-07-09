#!/bin/bash

echo "=== Demonstrating True Pipeline Implementation ==="
echo

# Create a test file
cat > /tmp/test_data.txt << EOF
apple
banana
cherry
apple
date
banana
elderberry
apple
fig
EOF

echo "Test 1: Simple pipe - count unique fruits"
echo "cat /tmp/test_data.txt | sort | uniq -c" | ./target/release/gemini-shell 2>&1 | grep -A 10 "✦"
echo

echo "Test 2: Three-stage pipeline"
echo "cat /tmp/test_data.txt | grep '^[ab]' | sort | uniq" | ./target/release/gemini-shell 2>&1 | grep -A 10 "✦"
echo

echo "Test 3: Pipeline with line counting"
echo "ls -1 src | grep '\.rs$' | wc -l" | ./target/release/gemini-shell 2>&1 | grep -A 5 "✦"
echo

echo "Test 4: Process pipeline"
echo "ps aux | grep gemini | grep -v grep | wc -l" | ./target/release/gemini-shell 2>&1 | grep -A 5 "✦"
echo

echo "Test 5: Demonstrating true piping vs sequential execution"
echo "Creating large test file..."
seq 1 10000 > /tmp/numbers.txt

echo "True pipeline (should be fast):"
time echo "cat /tmp/numbers.txt | grep '123' | wc -l" | ./target/release/gemini-shell 2>&1 | grep -A 3 "✦"
echo

# Cleanup
rm -f /tmp/test_data.txt /tmp/numbers.txt

echo "=== Pipeline demonstration complete ==="