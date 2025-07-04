import esbuild from 'esbuild';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJson = JSON.parse(
  readFileSync(join(__dirname, 'package.json'), 'utf8')
);

const isProduction = process.env.NODE_ENV === 'production';
const isWatch = process.argv.includes('--watch');

const config = {
  entryPoints: ['src/index-ultra-minimal.tsx'],
  bundle: true,
  outfile: 'dist/bundle.js',
  platform: 'browser',
  target: 'es2020',
  format: 'iife',
  jsx: 'automatic',
  jsxImportSource: 'react',
  minify: isProduction,
  sourcemap: !isProduction,
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.PACKAGE_VERSION': JSON.stringify(packageJson.version),
    'global': 'window',
    'process.platform': '"browser"',
    'process.versions': '{}',
  },
  loader: {
    '.css': 'css',
    '.png': 'file',
    '.jpg': 'file',
    '.jpeg': 'file',
    '.svg': 'file',
  },
  banner: {
    js: `// Gemini CLI Browser v${packageJson.version}
window.process = window.process || { env: {}, platform: 'browser', versions: {} };
window.global = window.global || window;`,
  },
  external: [
    // External modules that can't be bundled
    'https',
    'http',
    'net',
    'tls',
    'http2',
    'dns',
    'readline',
    'async_hooks',
    'zlib',
    'querystring',
    'child_process',
    'fs',
    'fs/promises',
    'path',
    'os',
    'crypto',
    'events',
    'util',
    'stream',
    'assert',
    'url',
    // MCP and other problematic dependencies
    '@modelcontextprotocol/sdk',
    'simple-git',
    'open',
    'glob',
    'undici',
    'default-browser-id',
    'rimraf',
    'path-scurry',
    'minipass',
  ],
};

if (isWatch) {
  config.plugins = [{
      name: 'watch-plugin',
      setup(build) {
        build.onStart(() => {
          console.log('Building browser bundle...');
        });
        build.onEnd((result) => {
          if (result.errors.length === 0) {
            console.log('✅ Build completed successfully');
          } else {
            console.log('❌ Build failed');
          }
        });
      },
    }];
}

if (isWatch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  
  // Also serve the files during development
  await ctx.serve({
    servedir: 'dist',
    port: 3000,
    host: 'localhost',
  });
  
  console.log('🚀 Development server running at http://localhost:3000');
} else {
  await esbuild.build(config);
  console.log('✅ Browser bundle built successfully');
}