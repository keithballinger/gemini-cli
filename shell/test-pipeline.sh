#!/bin/bash

echo "=== Testing Pipeline Functionality ==="
echo

echo "Test 1: Simple pipe"
echo "echo 'hello world' | grep world" | ./target/release/gemini-shell 2>&1 | tail -5
echo

echo "Test 2: Multi-stage pipe"
echo "echo -e 'line1\nline2\nline3' | grep line | wc -l" | ./target/release/gemini-shell 2>&1 | tail -5
echo

echo "Test 3: Gemini pipe"
echo "g list three colors | grep -i blue" | ./target/release/gemini-shell 2>&1 | tail -10
echo

echo "=== Pipeline tests complete ==="