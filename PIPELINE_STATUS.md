# Pipeline and Redirection Support Status

## Currently Working ✅

### Pipelines
- **External command pipelines**: `ls | grep pattern | head -10`
- **Multiple stage pipelines**: Commands can be chained with multiple pipes
- **Pipeline with redirections**: Can combine pipes with input/output redirections

### Redirections
- **Output redirection**: `command > file.txt`
- **Append redirection**: `command >> file.txt`
- **Input redirection**: `command < file.txt`
- **Error redirection**: `command 2> error.txt`

### Compound Commands
- **Sequential execution**: `command1 ; command2`
- **Conditional AND**: `command1 && command2`
- **Conditional OR**: `command1 || command2`

## Limitations ⚠️

### Builtins in Pipelines
- Built-in commands (echo, cd, pwd, etc.) cannot be used in pipelines
- Example: `echo "hello" | grep h` will fail
- Workaround: Use external command `/bin/echo "hello" | grep h`

### Complex Redirections
- No support for advanced redirections like `2>&1` (stderr to stdout)
- No support for here documents (`<<`)
- No support for process substitution `<(command)`

## Implementation Details

The shell has proper pipeline support through:
1. **Parser**: Recognizes `|`, `>`, `>>`, `<`, `2>` operators
2. **PipelineExecutor**: Handles connecting processes with pipes
3. **ShellInterface**: Routes multi-command inputs to pipeline executor

However, when commands are executed through the React shell interface, they go through `executeExternal` which delegates to bash, so the full pipeline functionality is available even for unsupported cases.

## Future Enhancements

1. **Support builtins in pipelines**: Need to implement a way to stream builtin output
2. **Advanced redirections**: Support `2>&1`, here documents, etc.
3. **Better error handling**: More descriptive errors for pipeline failures