import { CommandRouter } from '../commandRouter';

describe('CommandRouter', () => {
  let router: CommandRouter;

  beforeEach(() => {
    router = new CommandRouter();
  });

  describe('Gemini prefix detection', () => {
    it('should route "g " prefix to Gemini', async () => {
      const result = await router.route('g how do I list files');
      
      expect(result.type).toBe('gemini');
      expect(result.query).toBe('how do I list files');
      expect(result.isExplicit).toBe(true);
    });

    it('should route "_ " prefix to Gemini', async () => {
      const result = await router.route('_ explain this error');
      
      expect(result.type).toBe('gemini');
      expect(result.query).toBe('explain this error');
      expect(result.isExplicit).toBe(true);
    });

    it('should route "?" prefix to Gemini', async () => {
      const result = await router.route('?what is the current directory');
      
      expect(result.type).toBe('gemini');
      expect(result.query).toBe('what is the current directory');
      expect(result.isExplicit).toBe(true);
    });

    it('should handle prefix with extra spaces', async () => {
      const result = await router.route('g   list all processes');
      
      expect(result.type).toBe('gemini');
      expect(result.query).toBe('list all processes');
    });
  });

  describe('Shell command detection', () => {
    it('should route common shell commands', async () => {
      const commands = ['ls -la', 'cd /home', 'pwd', 'cat file.txt', 'git status'];
      
      for (const cmd of commands) {
        const result = await router.route(cmd);
        expect(result.type).toBe('shell');
        expect(result.command).toBe(cmd);
        expect(result.isExplicit).toBe(false);
      }
    });

    it('should detect paths as shell commands', async () => {
      const paths = ['./script.sh', '/usr/bin/node', '~/Documents'];
      
      for (const path of paths) {
        const result = await router.route(path);
        expect(result.type).toBe('shell');
        expect(result.command).toBe(path);
      }
    });

    it('should detect piped commands', async () => {
      const result = await router.route('ps aux | grep node');
      
      expect(result.type).toBe('shell');
      expect(result.command).toBe('ps aux | grep node');
    });

    it('should detect redirected commands', async () => {
      const commands = ['echo hello > file.txt', 'cat < input.txt', 'ls >> log.txt'];
      
      for (const cmd of commands) {
        const result = await router.route(cmd);
        expect(result.type).toBe('shell');
      }
    });
  });

  describe('Natural language detection', () => {
    it('should detect questions as natural language', async () => {
      const questions = [
        'what files are in this directory',
        'how do I compress these files',
        'where is my ssh key',
        'can you explain this error'
      ];
      
      for (const question of questions) {
        const result = await router.route(question);
        expect(result.type).toBe('gemini');
        expect(result.query).toBe(question);
        expect(result.isExplicit).toBe(false);
      }
    });

    it('should detect sentences ending with ? as natural language', async () => {
      const result = await router.route('is the server running?');
      
      expect(result.type).toBe('gemini');
      expect(result.query).toBe('is the server running?');
    });

    it('should detect polite phrases as natural language', async () => {
      const phrases = ['please help me debug this', 'thanks for the help'];
      
      for (const phrase of phrases) {
        const result = await router.route(phrase);
        expect(result.type).toBe('gemini');
      }
    });
  });

  describe('Ambiguous cases', () => {
    it('should default single words to shell', async () => {
      const words = ['vim', 'top', 'clear'];
      
      for (const word of words) {
        const result = await router.route(word);
        expect(result.type).toBe('shell');
        expect(result.command).toBe(word);
      }
    });

    it('should handle empty input as shell', async () => {
      const result = await router.route('');
      
      expect(result.type).toBe('shell');
      expect(result.command).toBe('');
    });

    it('should treat unknown multi-word without shell syntax as natural language', async () => {
      const result = await router.route('foo bar baz qux');
      
      expect(result.type).toBe('gemini');
      expect(result.query).toBe('foo bar baz qux');
    });
  });

  describe('Custom prefixes', () => {
    it('should allow updating gemini prefixes', async () => {
      router.setGeminiPrefixes(['ai ', 'ask ']);
      
      const result1 = await router.route('ai what is docker');
      expect(result1.type).toBe('gemini');
      expect(result1.query).toBe('what is docker');
      
      const result2 = await router.route('g this should be shell now');
      expect(result2.type).toBe('shell');
    });

    it('should return current prefixes', () => {
      const defaultPrefixes = router.getGeminiPrefixes();
      expect(defaultPrefixes).toEqual(['g ', '_ ', '?']);
      
      router.setGeminiPrefixes(['test ']);
      expect(router.getGeminiPrefixes()).toEqual(['test ']);
    });
  });

  describe('Edge cases', () => {
    it('should handle commands with gemini-like prefix in the middle', async () => {
      const result = await router.route('echo g this is not gemini');
      
      expect(result.type).toBe('shell');
      expect(result.command).toBe('echo g this is not gemini');
    });

    it('should handle variable assignments', async () => {
      const result = await router.route('FOO=bar');
      
      expect(result.type).toBe('shell');
    });

    it('should handle command substitution', async () => {
      const commands = ['echo $(date)', 'echo `pwd`'];
      
      for (const cmd of commands) {
        const result = await router.route(cmd);
        expect(result.type).toBe('shell');
      }
    });
  });
});