#!/bin/bash
# Simple script to run the Gemini shell

# Make sure we're in the right directory
cd "$(dirname "$0")"

# Run the shell
exec ./packages/cli/dist/index.js --shell