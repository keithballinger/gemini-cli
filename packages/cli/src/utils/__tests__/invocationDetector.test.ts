import { InvocationDetector, InvocationMode } from '../invocationDetector';
import * as os from 'os';
import * as fs from 'fs';

// Mock modules
jest.mock('os');
jest.mock('fs');
jest.mock('child_process');

describe('InvocationDetector', () => {
  const originalArgv = process.argv;
  const originalEnv = process.env;
  const originalPpid = process.ppid;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Reset process properties
    process.argv = [...originalArgv];
    process.env = { ...originalEnv };
    Object.defineProperty(process, 'ppid', {
      value: 1234,
      configurable: true
    });
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.env = originalEnv;
    Object.defineProperty(process, 'ppid', {
      value: originalPpid,
      configurable: true
    });
  });

  describe('detect()', () => {
    it('should return SHELL mode when --shell flag is present', () => {
      const result = InvocationDetector.detect({ shell: true });
      
      expect(result.mode).toBe(InvocationMode.SHELL);
      expect(result.isLoginShell).toBe(true);
      expect(result.detectionMethod).toBe('--shell flag');
    });

    it('should return SHELL mode when SHELL env matches argv[0]', () => {
      process.argv[0] = '/usr/local/bin/gemini';
      process.env.SHELL = '/usr/local/bin/gemini';
      
      const result = InvocationDetector.detect({});
      
      expect(result.mode).toBe(InvocationMode.SHELL);
      expect(result.isLoginShell).toBe(true);
      expect(result.detectionMethod).toBe('SHELL environment variable');
    });

    it('should return SHELL mode when argv[0] starts with dash', () => {
      process.argv[0] = '-gemini';
      
      const result = InvocationDetector.detect({});
      
      expect(result.mode).toBe(InvocationMode.SHELL);
      expect(result.isLoginShell).toBe(true);
      expect(result.detectionMethod).toBe('argv[0] starts with dash');
    });

    it('should return SHELL mode when parent process is init (ppid=1)', () => {
      Object.defineProperty(process, 'ppid', {
        value: 1,
        configurable: true
      });
      (os.platform as jest.Mock).mockReturnValue('linux');
      
      const result = InvocationDetector.detect({});
      
      expect(result.mode).toBe(InvocationMode.SHELL);
      expect(result.isLoginShell).toBe(true);
      expect(result.detectionMethod).toBe('parent process detection');
    });

    it('should return CLI mode by default', () => {
      process.argv[0] = '/usr/local/bin/gemini';
      process.env.SHELL = '/bin/bash';
      (os.platform as jest.Mock).mockReturnValue('darwin');
      
      const result = InvocationDetector.detect({});
      
      expect(result.mode).toBe(InvocationMode.CLI);
      expect(result.isLoginShell).toBe(false);
      expect(result.detectionMethod).toBe('default');
    });

    it('should check /etc/shells when GEMINI_SHELL_MODE is set', () => {
      process.env.GEMINI_SHELL_MODE = 'true';
      (os.platform as jest.Mock).mockReturnValue('linux');
      (fs.readFileSync as jest.Mock).mockReturnValue(
        '# List of acceptable shells\n/bin/bash\n/usr/local/bin/gemini\n'
      );
      
      const result = InvocationDetector.detect({});
      
      expect(result.mode).toBe(InvocationMode.SHELL);
      expect(result.isLoginShell).toBe(true);
      expect(result.detectionMethod).toBe('/etc/shells + GEMINI_SHELL_MODE env');
    });

    it('should handle Windows platform correctly', () => {
      (os.platform as jest.Mock).mockReturnValue('win32');
      
      const result = InvocationDetector.detect({});
      
      expect(result.mode).toBe(InvocationMode.CLI);
      expect(fs.readFileSync).not.toHaveBeenCalled(); // Should not check /etc/shells
    });
  });

  describe('getModeDescription()', () => {
    it('should return correct description for SHELL mode', () => {
      const info = {
        mode: InvocationMode.SHELL,
        isLoginShell: true,
        detectionMethod: '--shell flag'
      };
      
      const description = InvocationDetector.getModeDescription(info);
      
      expect(description).toBe('Running as login shell (detected via: --shell flag)');
    });

    it('should return correct description for CLI mode', () => {
      const info = {
        mode: InvocationMode.CLI,
        isLoginShell: false,
        detectionMethod: 'default'
      };
      
      const description = InvocationDetector.getModeDescription(info);
      
      expect(description).toBe('Running in CLI mode (interactive AI assistant)');
    });
  });

  describe('parent process detection', () => {
    it('should detect Terminal.app as login parent on macOS', () => {
      (os.platform as jest.Mock).mockReturnValue('darwin');
      const { execSync } = require('child_process');
      (execSync as jest.Mock).mockReturnValue('Terminal\n');
      
      const result = InvocationDetector.detect({});
      
      expect(result.mode).toBe(InvocationMode.SHELL);
      expect(result.detectionMethod).toBe('parent process detection');
    });

    it('should detect sshd as login parent on Linux', () => {
      (os.platform as jest.Mock).mockReturnValue('linux');
      (fs.readFileSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('/proc/')) {
          return '/usr/sbin/sshd\0-D\0';
        }
        return '';
      });
      
      const result = InvocationDetector.detect({});
      
      expect(result.mode).toBe(InvocationMode.SHELL);
      expect(result.detectionMethod).toBe('parent process detection');
    });

    it('should handle errors gracefully when checking parent process', () => {
      (os.platform as jest.Mock).mockReturnValue('linux');
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      const result = InvocationDetector.detect({});
      
      // Should fall back to default
      expect(result.mode).toBe(InvocationMode.CLI);
      expect(result.detectionMethod).toBe('default');
    });
  });
});