'use strict';

// Sandboxed preloads and renderers can't require node_modules, so the SDK's
// Electron bridge has to be bundled before the app starts.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const RENDERER_OUT = path.join(DIST, 'smartspectra-renderer.js');
const PRELOAD_OUT = path.join(DIST, 'preload.js');

function sdkProblem() {
  try {
    require.resolve('@smartspectra/node-sdk/renderer', { paths: [ROOT] });
    require.resolve('@smartspectra/node-sdk/preload', { paths: [ROOT] });
    return null;
  } catch (err) {
    return `@smartspectra/node-sdk is not installed (${err.code || err.message}). Run "npm install" again.`;
  }
}

function writeStub(reason) {
  fs.writeFileSync(
    RENDERER_OUT,
    `window.SmartSpectraMissing = ${JSON.stringify(reason)};\n`,
  );
  fs.rmSync(PRELOAD_OUT, { force: true });
}

async function main() {
  fs.mkdirSync(DIST, { recursive: true });
  const problem = sdkProblem();
  let esbuild = null;
  try {
    esbuild = require('esbuild');
  } catch {
    // Reported below; Practice mode still works without the bundle.
  }

  if (problem || !esbuild) {
    const reason = problem || 'esbuild is not installed. Run "npm install" again.';
    writeStub(reason);
    console.warn(`[breath-orchestra] Live camera disabled: ${reason}`);
    return;
  }

  await esbuild.build({
    entryPoints: [path.join(ROOT, 'src/renderer/sdk-entry.js')],
    outfile: RENDERER_OUT,
    bundle: true,
    platform: 'browser',
    format: 'iife',
    target: 'chrome120',
    logLevel: 'warning',
  });

  await esbuild.build({
    entryPoints: [path.join(ROOT, 'src/preload/preload.js')],
    outfile: PRELOAD_OUT,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['electron'],
    target: 'node20',
    logLevel: 'warning',
  });

  console.log('[breath-orchestra] SmartSpectra bridge bundled into dist/.');
}

main().catch((err) => {
  writeStub(`Bundling the SmartSpectra SDK failed: ${err.message}`);
  console.error(`[breath-orchestra] Could not bundle the SmartSpectra SDK: ${err.message}`);
});
