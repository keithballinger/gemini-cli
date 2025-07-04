#!/bin/bash

# Launch Gemini HUD in a specific directory
# Usage: launch_gemini_here.sh [directory]

DIR="${1:-$(pwd)}"
echo "Launching Gemini HUD in directory: $DIR"
open "gemini://launch$DIR"