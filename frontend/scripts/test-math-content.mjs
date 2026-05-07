import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const tempDir = mkdtempSync(join(tmpdir(), 'ai-tutor-math-content-'));
const bundlePath = join(tempDir, 'mathContent.mjs');

try {
  await esbuild.build({
    entryPoints: ['src/utils/mathContent.ts'],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: bundlePath,
    logLevel: 'silent',
  });

  const { normalizeMathDelimiters } = await import(pathToFileURL(bundlePath).href);

  assert.equal(
    normalizeMathDelimiters('方差是 \\(s^2=\\frac{1}{n-1}\\sum_i (x_i-\\bar{x})^2\\)。'),
    '方差是 $s^2=\\frac{1}{n-1}\\sum_i (x_i-\\bar{x})^2$。',
  );

  assert.equal(
    normalizeMathDelimiters('正态密度：\\[ f(x)=\\frac{1}{\\sqrt{2\\pi}\\sigma}e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}} \\]'),
    '正态密度：\n$$\nf(x)=\\frac{1}{\\sqrt{2\\pi}\\sigma}e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}\n$$',
  );

  assert.equal(
    normalizeMathDelimiters('已标准化：$z=\\frac{x-\\mu}{\\sigma}$ 和 $$E[X]=\\sum_x x p(x)$$'),
    '已标准化：$z=\\frac{x-\\mu}{\\sigma}$ 和 $$\nE[X]=\\sum_x x p(x)\n$$',
  );
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
