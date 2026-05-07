import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as esbuild from 'esbuild';

const tempDir = mkdtempSync(join(tmpdir(), 'ai-tutor-math-message-'));
const bundlePath = join(tempDir, 'renderMathMessage.cjs');
const require = createRequire(import.meta.url);

try {
  await esbuild.build({
    stdin: {
      contents: `
        import React from 'react';
        import { renderToStaticMarkup } from 'react-dom/server';
        import { MathMessage } from './src/components/MathMessage';

        export const html = renderToStaticMarkup(
          React.createElement(MathMessage, {
            content: '方差公式：\\\\(s^2=\\\\frac{1}{n-1}\\\\sum_i (x_i-\\\\bar{x})^2\\\\)\\n\\n\\\\[ z=\\\\frac{x-\\\\mu}{\\\\sqrt{\\\\sigma^2}} \\\\]',
          }),
        );
      `,
      resolveDir: process.cwd(),
      sourcefile: 'render-math-message.tsx',
      loader: 'tsx',
    },
    bundle: true,
    format: 'cjs',
    jsx: 'automatic',
    platform: 'node',
    outfile: bundlePath,
    loader: {
      '.css': 'empty',
    },
    logLevel: 'silent',
  });

  const { html } = require(bundlePath);

  assert.match(html, /class="[^"]*math-message/);
  assert.match(html, /class="[^"]*katex/);
  assert.match(html, /class="[^"]*katex-display/);
  assert.match(html, /<math/);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
