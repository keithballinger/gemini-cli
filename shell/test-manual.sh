#!/bin/bash

echo "Starting manual integration test..."
echo
echo "The Gemini Shell will start. Try these commands:"
echo "  1. pwd                    - Test basic shell command"
echo "  2. g say hello            - Test Gemini AI integration"
echo "  3. _ ls -la               - Test command analysis"
echo "  4. g echo 'test' then echo %% - Test response piping"
echo "  5. exit                   - Exit the shell"
echo
echo "Press Enter to start..."
read

./target/release/gemini-shell