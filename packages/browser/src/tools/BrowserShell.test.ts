import { describe, it, expect, beforeEach } from 'vitest';
import { BrowserShell } from './BrowserShell';

describe('BrowserShell', () => {
  let shell: BrowserShell;

  beforeEach(() => {
    shell = new BrowserShell();
  });

  it('should execute echo command', async () => {
    const result = await shell.runCommand('echo hello world');
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('hello world\n');
    expect(result.stderr).toBe('');
    expect(result.error).toBeUndefined();
  });

  it('should execute date command', async () => {
    const result = await shell.runCommand('date');
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/\d{4}/); // Should contain a year
    expect(result.stderr).toBe('');
  });

  it('should execute pwd command', async () => {
    const result = await shell.runCommand('pwd');
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('/virtual-workspace\n');
    expect(result.stderr).toBe('');
  });

  it('should execute whoami command', async () => {
    const result = await shell.runCommand('whoami');
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('browser-user\n');
    expect(result.stderr).toBe('');
  });

  it('should show help for help command', async () => {
    const result = await shell.runCommand('help');
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Browser Shell');
    expect(result.stdout).toContain('Available commands');
    expect(result.stderr).toBe('');
  });

  it('should reject unsupported commands', async () => {
    const result = await shell.runCommand('rm -rf /');
    
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('not supported in browser environment');
    expect(result.error).toBe('Command not supported');
  });

  it('should handle commands with extra whitespace', async () => {
    const result = await shell.runCommand('  echo   hello   world  ');
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('hello world\n');
  });

  it('should check if commands are supported', () => {
    expect(shell.isCommandSupported('echo')).toBe(true);
    expect(shell.isCommandSupported('ECHO')).toBe(true); // Case insensitive
    expect(shell.isCommandSupported('rm')).toBe(false);
    expect(shell.isCommandSupported('ls')).toBe(false);
  });

  it('should return list of available commands', () => {
    const commands = shell.getAvailableCommands();
    
    expect(commands).toContain('echo');
    expect(commands).toContain('date');
    expect(commands).toContain('pwd');
    expect(commands).toContain('whoami');
    expect(commands).toContain('help');
    expect(commands.length).toBeGreaterThan(0);
  });
});