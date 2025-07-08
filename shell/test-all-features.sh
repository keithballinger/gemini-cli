#!/bin/bash

echo "=== Comprehensive Gemini Shell Integration Test ==="
echo

# Kill any existing server and restart to get fresh logs
pkill -f "node src/server.js" || true
sleep 1
cd nodejs-bridge && nohup node src/server.js > server-test.log 2>&1 &
cd ..
sleep 2

echo "Test 1: Basic shell command (pwd)"
echo "pwd" | ./target/release/gemini-shell | grep -E "(shell\$|shell/\$)" && echo "✓ Basic command works" || echo "✗ Basic command failed"
echo

echo "Test 2: Gemini query with 'g' prefix"
result=$(echo "g respond with just the word YES" | ./target/release/gemini-shell 2>&1)
echo "$result" | grep -i "yes" > /dev/null && echo "✓ Gemini query works" || echo "✗ Gemini query failed"
echo

echo "Test 3: Command analysis with '_' prefix"
result=$(echo "_ echo hello" | ./target/release/gemini-shell 2>&1)
echo "$result" | grep -E "(echo|command|output)" > /dev/null && echo "✓ Command analysis works" || echo "✗ Command analysis failed"
echo

echo "Test 4: Built-in commands (alias)"
result=$(echo -e "alias test='echo works'\nalias" | ./target/release/gemini-shell 2>&1)
echo "$result" | grep "test=" > /dev/null && echo "✓ Alias command works" || echo "✗ Alias command failed"
echo

echo "Test 5: Terminal UI mode"
timeout 2 ./target/release/gemini-shell --ui < /dev/null > /dev/null 2>&1
[ $? -eq 124 ] && echo "✓ UI mode starts" || echo "✗ UI mode failed"
echo

echo "=== Server logs ==="
tail -20 nodejs-bridge/server-test.log
echo

echo "=== Test complete ==="