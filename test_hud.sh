#!/bin/bash
cd /Users/keithballinger/Desktop/projects/gemini-cli/gui/GeminiHUD
./.build/debug/GeminiHUD 2>&1 | tee /tmp/hud_output.log