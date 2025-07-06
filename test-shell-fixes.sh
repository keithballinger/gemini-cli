#!/bin/bash

echo "Testing environment variable persistence and escape sequences..."
echo ""

# Test 1: Environment variable persistence
echo "Test 1: Setting TEST_VAR=hello and exiting shell"
echo -e "export TEST_VAR=hello\nexit" | ./run-shell.sh
echo ""

echo "Test 2: Checking if TEST_VAR persists in new shell session"
echo -e "echo \$TEST_VAR\nexit" | ./run-shell.sh
echo ""

# Test 3: Testing paste mode (simulating bracketed paste)
echo "Test 3: Testing bracketed paste mode filtering"
echo -e "\033[200~echo hello world\033[201~\nexit" | ./run-shell.sh
echo ""

# Test 4: Testing Option+Right at end of line
echo "Test 4: Testing Option+Right arrow at end of line"
echo -e "echo test\033f\nexit" | ./run-shell.sh
echo ""

echo "Tests completed."