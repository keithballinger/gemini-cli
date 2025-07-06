/**
 * CommandRouter - Routes commands between shell execution and Gemini AI
 * 
 * In shell mode, this router determines whether input should be:
 * 1. Sent to Gemini AI (with 'g ' or '_ ' prefix)
 * 2. Executed as a shell command
 * 3. Detected as natural language and sent to Gemini
 */

export interface RouteResult {
  type: 'shell' | 'gemini';
  query?: string;
  command?: string;
  isExplicit: boolean;
  originalInput: string;
}

export class CommandRouter {
  private geminiPrefixes: string[];
  private naturalLanguagePatterns: RegExp[];

  constructor(options?: {
    geminiPrefixes?: string[];
    enableNaturalLanguage?: boolean;
    naturalLanguagePatterns?: RegExp[];
  }) {
    this.geminiPrefixes = options?.geminiPrefixes || ['g ', '_ ', '?'];
    
    // Common natural language patterns
    this.naturalLanguagePatterns = options?.naturalLanguagePatterns || [
      /^(what|where|when|who|why|how|can|could|should|would|will|is|are|do|does|did)\s+/i,
      /^(explain|show|tell|help|find|search|look)\s+/i,
      /^(please|thanks|thank you)/i,
      /\?$/,  // Ends with question mark
    ];
  }

  /**
   * Route a command based on its content
   */
  async route(input: string): Promise<RouteResult> {
    const trimmedInput = input.trim();
    
    // Check for explicit Gemini prefixes
    for (const prefix of this.geminiPrefixes) {
      if (trimmedInput.startsWith(prefix)) {
        return {
          type: 'gemini',
          query: trimmedInput.slice(prefix.length).trim(),
          isExplicit: true,
          originalInput: input
        };
      }
    }

    // Check if it looks like a valid shell command
    if (this.looksLikeShellCommand(trimmedInput)) {
      return {
        type: 'shell',
        command: trimmedInput,
        isExplicit: false,
        originalInput: input
      };
    }

    // Check for natural language patterns
    if (this.looksLikeNaturalLanguage(trimmedInput)) {
      return {
        type: 'gemini',
        query: trimmedInput,
        isExplicit: false,
        originalInput: input
      };
    }

    // Default to shell command (will show command not found if invalid)
    return {
      type: 'shell',
      command: trimmedInput,
      isExplicit: false,
      originalInput: input
    };
  }

  /**
   * Basic heuristic to check if input looks like a shell command
   */
  private looksLikeShellCommand(input: string): boolean {
    if (!input) return false;

    // Common shell command patterns
    const shellPatterns = [
      /^(ls|cd|pwd|cat|echo|grep|find|mkdir|rm|cp|mv|touch|chmod|chown)\s/,
      /^(git|npm|yarn|pnpm|node|python|pip|make|gcc|vim|nano|curl|wget)\s/,
      /^(ps|top|kill|df|du|tar|zip|unzip|ssh|scp|rsync)\s/,
      /^\.?\//,  // Starts with ./ or /
      /^~/,      // Starts with ~
      /^\w+$/,   // Single word (could be a command)
      /^sudo\s/,
      /\|/,      // Contains pipe
      /[<>]/,    // Contains redirection
      /&&|\|\|/, // Contains logical operators
    ];

    return shellPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Check if input looks like natural language
   */
  private looksLikeNaturalLanguage(input: string): boolean {
    if (!input || input.length < 3) return false;

    // Check against natural language patterns
    if (this.naturalLanguagePatterns.some(pattern => pattern.test(input))) {
      return true;
    }

    // Additional heuristics
    const words = input.split(/\s+/);
    
    // Multiple words without shell-like syntax
    if (words.length >= 3 && !this.containsShellSyntax(input)) {
      return true;
    }

    return false;
  }

  /**
   * Check if input contains shell-specific syntax
   */
  private containsShellSyntax(input: string): boolean {
    const shellSyntax = [
      /[|&<>]/,           // Pipes, background, redirection
      /\$\w+/,            // Variables
      /["`]/,             // Command substitution
      /\\\s*$/,           // Line continuation
      /^-+\w/,            // Flags
      /\w+=/,             // Variable assignment
      /[;]/,              // Command separator
    ];

    return shellSyntax.some(pattern => pattern.test(input));
  }

  /**
   * Update gemini prefixes at runtime
   */
  setGeminiPrefixes(prefixes: string[]): void {
    this.geminiPrefixes = prefixes;
  }

  /**
   * Get current gemini prefixes
   */
  getGeminiPrefixes(): string[] {
    return [...this.geminiPrefixes];
  }
}