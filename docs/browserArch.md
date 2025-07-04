# Architecture Technical Design: Browser Support

## 1. Goal

The primary objective is to enable the Gemini CLI application functionality to run within a standard web browser. This will allow for the creation of a new web-based interface (`@gemini/browser`) that provides similar functionality to the existing command-line tool (`@gemini/cli`).

## 2. The Core Challenge: Environment-Specific APIs

The existing `@gemini/core` package was designed for the Node.js runtime and has direct dependencies on Node.js-specific APIs that have no equivalent in the browser environment. These include:

-   **File System (`fs`, `fs/promises`)**: Browsers cannot directly access the user's local file system for security reasons.
-   **Child Processes (`child_process`)**: Browsers cannot spawn arbitrary shell commands.
-   **Operating System (`os`)**: Access to OS-level information is heavily restricted in browsers.
-   **Path (`path`)**: The browser's concept of paths is URL-based, not filesystem-based.

## 3. Revised Architecture: Browser-Specific Tools

Rather than refactoring the existing `@gemini/core` package (which could introduce risks to the stable CLI application), we will create a new `@gemini/browser` package with its own set of browser-optimized tools.

### Key Principles:

1. **Zero Risk to Existing Code**: Keep `@gemini/core` and `@gemini/cli` completely unchanged
2. **Browser-Native Design**: Create tools specifically designed for browser capabilities and limitations
3. **Clean Separation**: CLI tools remain CLI-focused, browser tools are web-native
4. **Optimized UX**: Browser tools can leverage web-specific patterns (file uploads, downloads, etc.)

## 4. Implementation Plan

### Phase 1: Create Browser Package

-   **Action**: Create a new package, `@gemini/browser`
-   **Action**: Set up TypeScript configuration, build scripts, and testing framework
-   **Action**: Create package structure with `src/tools/`, `src/ui/`, and `src/core/` directories

### Phase 2: Implement Browser-Specific Tools

Create browser-optimized versions of core functionality:

#### Browser File System Tools
-   **`BrowserFileReader`**: Uses File API for reading uploaded files
-   **`BrowserFileWriter`**: Downloads files to user's system or saves to virtual filesystem
-   **`BrowserDirectoryLister`**: Lists files in virtual filesystem or uploaded file collections

#### Browser Shell Tools
-   **`BrowserShell`**: Either disabled with helpful messaging or uses Web Workers for safe operations
-   **`BrowserProcessInfo`**: Uses navigator APIs to provide system information

#### Browser Web Tools
-   **`BrowserWebFetch`**: Optimized web fetching with CORS handling
-   **`BrowserWebSearch`**: Web search functionality with browser-specific optimizations

### Phase 3: Core Browser Logic

-   **Action**: Create a browser-specific version of the core chat logic
-   **Action**: Implement tool registry for browser tools
-   **Action**: Set up Gemini API integration for browser environment

### Phase 4: Browser UI

-   **Action**: Create React-based UI components
-   **Action**: Implement file upload/download interfaces
-   **Action**: Build chat interface optimized for web usage
-   **Action**: Configure esbuild for browser bundle generation

### Phase 5: Deployment

-   **Action**: Build system generates static assets (`index.html`, `index.js`, `index.css`)
-   **Action**: Configure for easy deployment to web hosting services
-   **Action**: Add development server setup

## 5. Benefits of this Architecture

-   **Risk-Free**: Existing CLI functionality remains completely unchanged
-   **Optimized**: Browser tools are designed specifically for web environment
-   **Maintainable**: Clear separation between CLI and browser implementations
-   **Extensible**: Easy to add new browser-specific features without affecting CLI
-   **Performance**: Browser tools can be optimized for web performance characteristics

## 6. Browser Tool Implementations

### File Operations
- **Upload Interface**: Drag-and-drop or file picker for user files
- **Virtual Filesystem**: In-memory file system for temporary operations
- **Download Interface**: Save processed files to user's system

### Shell Operations
- **Limited Shell**: Disabled with clear messaging about limitations
- **Web Workers**: Safe execution of certain operations in isolated contexts
- **Service Integration**: API calls to external services for operations requiring server-side execution

### System Information
- **Navigator APIs**: Browser, OS, and device information
- **Performance APIs**: Memory and timing information where available
- **Geolocation**: Optional location services integration
