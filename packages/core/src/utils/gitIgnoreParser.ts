/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { platform } from '../platform.js';
import ignore, { type Ignore } from 'ignore';
import { isGitRepository } from './gitUtils.js';

export interface GitIgnoreFilter {
  isIgnored(filePath: string): boolean;
  getPatterns(): string[];
}

export class GitIgnoreParser implements GitIgnoreFilter {
  private projectRoot: string;
  private ig: Ignore = ignore();
  private patterns: string[] = [];

  constructor(projectRoot: string) {
    this.projectRoot = platform.path.resolve(projectRoot);
  }

  loadGitRepoPatterns(): void {
    if (!isGitRepository(this.projectRoot)) return;

    // Always ignore .git directory regardless of .gitignore content
    this.addPatterns(['.git']);

    const patternFiles = ['.gitignore', platform.path.join('.git', 'info', 'exclude')];
    for (const pf of patternFiles) {
      this.loadPatterns(pf);
    }
  }

  loadPatterns(patternsFileName: string): void {
    const patternsFilePath = platform.path.join(this.projectRoot, patternsFileName);
    let content: string;
    try {
      content = platform.fs.readFileSync(patternsFilePath, 'utf-8') as string;
    } catch (_error) {
      // ignore file not found
      return;
    }
    const patterns = (content ?? '')
      .split('\n')
      .map((p) => p.trim())
      .filter((p) => p !== '' && !p.startsWith('#'));
    this.addPatterns(patterns);
  }

  private addPatterns(patterns: string[]) {
    this.ig.add(patterns);
    this.patterns.push(...patterns);
  }

  isIgnored(filePath: string): boolean {
    const relativePath = platform.path.isAbsolute(filePath)
      ? platform.path.relative(this.projectRoot, filePath)
      : filePath;

    if (relativePath === '' || relativePath.startsWith('..')) {
      return false;
    }

    let normalizedPath = relativePath.replace(/\\/g, '/');
    if (normalizedPath.startsWith('./')) {
      normalizedPath = normalizedPath.substring(2);
    }

    return this.ig.ignores(normalizedPath);
  }

  getPatterns(): string[] {
    return this.patterns;
  }
}
