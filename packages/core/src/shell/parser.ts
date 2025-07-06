/**
 * Shell command parser
 * Uses sh-syntax WASM parser when available, falls back to basic parser
 */

import { 
  Command, 
  ParsedCommand, 
  Token, 
  Redirection, 
  Pipeline,
  CompoundCommand,
  ParseError 
} from './types.js';

// Try to import sh-syntax parser
let ShSyntaxParser: any;
let useShSyntax = false;

try {
  // Dynamic import to handle optional dependency
  const module = await import('./parser/shSyntaxParser.js');
  ShSyntaxParser = module.ShSyntaxParser;
  useShSyntax = true;
} catch (error) {
  console.warn('sh-syntax parser not available, using basic parser');
}

export class ShellParser {
  private shSyntaxParser?: any;

  constructor() {
    if (useShSyntax && ShSyntaxParser) {
      this.shSyntaxParser = new ShSyntaxParser();
    }
  }
  /**
   * Parse a command string into a structured command object
   * Uses sh-syntax if available, otherwise falls back to basic parser
   */
  async parse(input: string): Promise<ParsedCommand[]> {
    if (!input.trim()) {
      return [];
    }

    // Use sh-syntax parser if available
    if (this.shSyntaxParser) {
      try {
        return await this.shSyntaxParser.parse(input);
      } catch (error) {
        // If sh-syntax fails, fall back to basic parser
        console.warn('sh-syntax parse failed, using basic parser:', error instanceof Error ? error.message : String(error));
      }
    }

    // Fallback to basic tokenization
    const tokens = this.tokenize(input);
    const commands = this.parseTokens(tokens);
    
    return commands;
  }

  /**
   * Basic tokenization - will be replaced with proper lexer
   */
  private tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    const regex = /(["|'])((?:\\.|(?!\1).)*?)\1|(\S+)/g;
    let match;
    
    while ((match = regex.exec(input)) !== null) {
      const value = match[2] || match[3];
      const start = match.index;
      const end = start + match[0].length;
      
      tokens.push({
        type: this.getTokenType(value),
        value,
        position: { start, end }
      });
    }
    
    return tokens;
  }

  private getTokenType(value: string): Token['type'] {
    if (value === '|') return 'pipe';
    if (value === ';' || value === '&&' || value === '||') return 'separator';
    if (value === '>' || value === '>>' || value === '<' || value.startsWith('2>')) return 'redirect';
    if (value === '&' || value === '(' || value === ')') return 'operator';
    return 'word';
  }

  /**
   * Parse tokens into commands - basic implementation
   */
  private parseTokens(tokens: Token[]): ParsedCommand[] {
    const commands: ParsedCommand[] = [];
    let current: ParsedCommand = this.createEmptyCommand();
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      switch (token.type) {
        case 'word':
          if (!current.executable) {
            current.executable = token.value;
          } else {
            current.args.push(token.value);
          }
          break;
          
        case 'pipe':
        case 'separator':
          if (current.executable) {
            commands.push(current);
          }
          current = this.createEmptyCommand();
          break;
          
        case 'redirect':
          // Handle redirection
          if (i + 1 < tokens.length) {
            const target = tokens[++i];
            current.redirections.push(this.parseRedirection(token.value, target.value));
          }
          break;
          
        case 'operator':
          if (token.value === '&') {
            current.background = true;
          }
          break;
      }
      
      current.tokens.push(token);
    }
    
    if (current.executable) {
      commands.push(current);
    }
    
    return commands;
  }

  private createEmptyCommand(): ParsedCommand {
    return {
      type: 'simple',
      args: [],
      redirections: [],
      background: false,
      raw: '',
      tokens: []
    };
  }

  private parseRedirection(operator: string, target: string): Redirection {
    const typeMap: Record<string, Redirection['type']> = {
      '>': 'output',
      '>>': 'append',
      '<': 'input',
      '2>': 'error'
    };
    
    return {
      type: typeMap[operator] || 'output',
      target
    };
  }

  /**
   * Validate command syntax
   */
  async validateSyntax(input: string): Promise<{ valid: boolean; error?: string }> {
    // Use sh-syntax parser if available
    if (this.shSyntaxParser) {
      return await this.shSyntaxParser.validateSyntax(input);
    }

    // Fallback to basic validation
    try {
      // Basic validation
      if (input.includes(';;')) {
        return { valid: false, error: 'Syntax error: unexpected ;;' };
      }
      
      // Check for unmatched quotes
      const quotes = input.match(/['"]/g) || [];
      if (quotes.length % 2 !== 0) {
        return { valid: false, error: 'Syntax error: unmatched quote' };
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}