#!/bin/bash

echo "=== Gemini Shell Enhanced UI Demo ==="
echo
echo "The enhanced UI includes:"
echo "  • Mouse support - click to position cursor, drag to select"
echo "  • Ctrl+R - Reverse history search"
echo "  • Tab - Command completion"
echo "  • Ctrl+A/E - Jump to beginning/end of line"
echo "  • Ctrl+K/U - Kill to end/beginning of line"
echo "  • Ctrl+Y - Yank (paste)"
echo "  • Ctrl+W - Delete word backward"
echo "  • Alt+B/F - Move word backward/forward"
echo "  • Ctrl+Space - Set mark for selection"
echo "  • And many more emacs-style keybindings!"
echo
echo "To try the enhanced UI, run:"
echo "  ./target/release/gemini-shell --enhanced"
echo
echo "For comparison, the standard UI:"
echo "  ./target/release/gemini-shell"
echo
echo "Let's demonstrate some features with expect..."

# Create an expect script to demonstrate features
cat > demo-enhanced.exp << 'EOF'
#!/usr/bin/expect -f

set timeout 5
spawn ./target/release/gemini-shell --enhanced

# Wait for prompt
expect "Enhanced UI:"

# Type a command
send "echo Hello from enhanced UI\r"
expect "Hello from enhanced UI"

# Test Ctrl+A and Ctrl+E
send "This is a long command line"
send "\001"  ;# Ctrl+A - go to beginning
send "START "
send "\005"  ;# Ctrl+E - go to end
send " END\r"
expect "START This is a long command line END"

# Test Ctrl+W (delete word)
send "one two three four"
send "\027"  ;# Ctrl+W - delete "four"
send "\027"  ;# Ctrl+W - delete "three"
send "\r"
expect "one two"

# Test history search (Ctrl+R)
send "\022"  ;# Ctrl+R
expect "reverse-i-search"
send "echo"
send "\r"
expect "echo"

# Exit
send "exit\r"
expect "Goodbye!"
expect eof
EOF

if command -v expect > /dev/null; then
    chmod +x demo-enhanced.exp
    echo "Running automated demo..."
    ./demo-enhanced.exp
    rm -f demo-enhanced.exp
else
    echo "Note: Install 'expect' to see an automated demonstration"
fi

echo
echo "=== Enhanced UI Demo Complete ==="