'use strict';

// Prints everything we'd ask for when live mode won't start. Never prints the key.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
let problems = 0;

function ok(label, detail = '') {
  console.log(`  ok    ${label}${detail ? ` - ${detail}` : ''}`);
}

function warn(label, detail = '') {
  console.log(`  warn  ${label}${detail ? ` - ${detail}` : ''}`);
}

function bad(label, detail = '') {
  problems += 1;
  console.log(`  FAIL  ${label}${detail ? ` - ${detail}` : ''}`);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function pkgDir(name) {
  try {
    return path.dirname(require.resolve(`${name}/package.json`, { paths: [ROOT] }));
  } catch {
    return null;
  }
}

function checkRuntime() {
  console.log('Runtime');
  const major = Number(process.versions.node.split('.')[0]);
  if (major >= 20) ok('Node', process.version);
  else bad('Node', `${process.version}; the SDK needs Node 20 or newer`);
  const platformArch = `${process.platform}-${process.arch}`;
  if (platformArch === 'darwin-x64') {
    // An x64 Node on Apple Silicon installs the wrong native package.
    bad('Platform', `${platformArch}. This Node is an Intel build (Rosetta). Install the Apple Silicon (arm64) Node and reinstall.`);
  } else {
    ok('Platform', `${platformArch}${process.platform === 'darwin' ? ` (macOS ${osVersion()})` : ''}`);
  }
  const electronDir = pkgDir('electron');
  const electron = electronDir && readJson(path.join(electronDir, 'package.json'));
  if (!electron) bad('Electron', 'not installed; run npm install');
  else if (Number(electron.version.split('.')[0]) < 28) bad('Electron', `${electron.version}; the SDK needs 28+`);
  else ok('Electron', electron.version);
  const esbuildDir = pkgDir('esbuild');
  if (esbuildDir) ok('esbuild', readJson(path.join(esbuildDir, 'package.json')).version);
  else bad('esbuild', 'not installed; run npm install (npm start uses it to bundle the SDK bridge)');
}

function osVersion() {
  const out = spawnSync('sw_vers', ['-productVersion'], { encoding: 'utf8' });
  return out.status === 0 ? out.stdout.trim() : 'unknown';
}

function checkSdk() {
  console.log('SmartSpectra SDK');
  const sdkDir = pkgDir('@smartspectra/node-sdk');
  if (!sdkDir) {
    bad('@smartspectra/node-sdk', 'not installed. Run npm install and watch for errors (it downloads a few hundred MB)');
    return;
  }
  ok('@smartspectra/node-sdk', readJson(path.join(sdkDir, 'package.json')).version);

  const nativeName = `@smartspectra/node-sdk-${process.platform}-${process.arch}`;
  const nativeDir = pkgDir(nativeName);
  const libName = {
    darwin: 'libsmartspectra_capi.dylib',
    linux: 'libsmartspectra_capi.so',
    win32: 'smartspectra_capi.dll',
  }[process.platform];
  if (!nativeDir) {
    bad(nativeName, 'not installed; this platform is unsupported or the install was cut short');
  } else if (!libName || !fs.existsSync(path.join(nativeDir, libName))) {
    bad(nativeName, `installed but ${libName || 'the native library'} is missing; reinstall`);
  } else {
    ok(nativeName, `${libName} present`);
  }

  try {
    require(require.resolve('@smartspectra/node-sdk', { paths: [ROOT] }));
    ok('SDK loads in Node');
  } catch (err) {
    bad('SDK loads in Node', String(err.message).split('\n')[0]);
  }

  const bundle = path.join(ROOT, 'dist/smartspectra-renderer.js');
  const preload = path.join(ROOT, 'dist/preload.js');
  if (!fs.existsSync(bundle) || !fs.existsSync(preload)) {
    warn('Bridge bundle', 'not built yet; npm start builds it');
  } else if (fs.readFileSync(bundle, 'utf8').startsWith('window.SmartSpectraMissing')) {
    bad('Bridge bundle', 'last build could not find the SDK; run npm install, then npm start');
  } else {
    ok('Bridge bundle', 'dist/ is built');
  }
}

function checkEnv() {
  console.log('API key');
  const envFile = path.join(ROOT, '.env');
  if (!fs.existsSync(envFile)) {
    bad('.env', 'missing. Run: cp .env.example .env, then paste your key after SMARTSPECTRA_API_KEY=');
    return;
  }
  const line = fs.readFileSync(envFile, 'utf8').split(/\r?\n/)
    .find((l) => /^\s*(export\s+)?SMARTSPECTRA_API_KEY\s*=/.test(l));
  if (!line) {
    bad('SMARTSPECTRA_API_KEY', '.env has no SMARTSPECTRA_API_KEY= line');
    return;
  }
  const raw = line.slice(line.indexOf('=') + 1);
  const value = raw.trim().replace(/^['"]|['"]$/g, '');
  if (!value) {
    bad('SMARTSPECTRA_API_KEY', 'is empty');
    return;
  }
  ok('SMARTSPECTRA_API_KEY', 'is set (not shown)');
  if (raw !== raw.trim() || /\s/.test(value)) warn('SMARTSPECTRA_API_KEY', 'has spaces in it; remove them');
  if (/['"]/.test(raw)) warn('SMARTSPECTRA_API_KEY', 'is wrapped in quotes; that works, but plain is safer');
  if (value === 'your_key_here') bad('SMARTSPECTRA_API_KEY', 'is still the placeholder');
}

function checkCamera() {
  console.log('Camera');
  if (process.platform !== 'darwin') {
    ok('Camera permission', 'no OS prompt needed on this platform');
    return;
  }
  const electronDir = pkgDir('electron');
  if (!electronDir) return;
  const electronBin = require(electronDir);
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const out = spawnSync(electronBin, [path.join(__dirname, 'doctor-camera.js')], {
    encoding: 'utf8',
    timeout: 20000,
    env,
  });
  const status = (out.stdout || '').match(/camera=(\S+)/);
  const value = status ? status[1] : 'unknown';
  const fix = 'System Settings > Privacy & Security > Camera, turn on the app you run npm start from (Terminal, iTerm, VS Code or Cursor), then quit and reopen it';
  if (value === 'granted') ok('Camera permission', 'granted to this terminal app');
  else if (value === 'not-determined') warn('Camera permission', 'not asked yet; the app will ask when you choose "Use my camera"');
  else if (value === 'denied' || value === 'restricted') bad('Camera permission', `${value}. ${fix}`);
  else warn('Camera permission', `could not read it (${value}). If the preview stays black: ${fix}`);
}

checkRuntime();
checkSdk();
checkEnv();
checkCamera();
console.log(problems ? `\n${problems} problem(s) found.` : '\nAll good. Run npm start.');
process.exitCode = problems ? 1 : 0;
