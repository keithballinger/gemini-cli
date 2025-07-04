import { beforeAll } from 'vitest';

beforeAll(() => {
  // Setup for browser environment tests
  global.fetch = global.fetch || fetch;
  
  // Mock File API if needed
  if (!global.File) {
    global.File = class File {
      constructor(
        public chunks: BlobPart[],
        public name: string,
        public options: FilePropertyBag = {}
      ) {}
    } as any;
  }
});