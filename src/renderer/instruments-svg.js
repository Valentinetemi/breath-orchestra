 'use strict';

function celloSvg() {
  return `
<svg class="inst inst-cello" viewBox="0 0 220 540" aria-hidden="true">
  <defs>
    <linearGradient id="celloWood" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6b3218"/>
      <stop offset="0.35" stop-color="#b86832"/>
      <stop offset="0.55" stop-color="#e0a15a"/>
      <stop offset="0.7" stop-color="#8a4a22"/>
      <stop offset="1" stop-color="#3c1c0e"/>
    </linearGradient>
    <linearGradient id="celloGloss" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/>
      <stop offset="0.35" stop-color="#fff" stop-opacity="0.28"/>
      <stop offset="0.5" stop-color="#fff" stop-opacity="0.05"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.25"/>
    </linearGradient>
    <linearGradient id="celloBoard" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#1a1210"/>
      <stop offset="0.5" stop-color="#3a2a22"/>
      <stop offset="1" stop-color="#120c0a"/>
    </linearGradient>
    <linearGradient id="bowStick" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d8b37a"/>
      <stop offset="1" stop-color="#6a4a28"/>
    </linearGradient>
  </defs>
  <g class="instrument-body">
    <ellipse class="glow-pool" cx="110" cy="340" rx="78" ry="28" fill="currentColor" opacity="0.22"/>
    <path fill="url(#celloWood)" stroke="#2a140c" stroke-width="1.2" d="M110 208
      C148 208 168 236 168 268 C168 292 156 308 148 322
      C162 338 176 366 176 396 C176 452 148 492 110 492
      C72 492 44 452 44 396 C44 366 58 338 72 322
      C64 308 52 292 52 268 C52 236 72 208 110 208Z"/>
    <path fill="url(#celloGloss)" d="M110 212 C140 212 160 238 160 268 C160 300 140 318 128 332 L118 326 C126 314 138 298 138 270 C138 246 126 222 110 222Z" opacity="0.7"/>
    <path class="f-hole" fill="#140a06" d="M78 348 C78 336 86 330 90 340 C92 348 86 358 86 370 C86 382 94 390 88 398 C80 398 74 386 74 372 C74 360 70 350 78 348Z"/>
    <path class="f-hole" fill="#140a06" d="M142 348 C142 336 134 330 130 340 C128 348 134 358 134 370 C134 382 126 390 132 398 C140 398 146 386 146 372 C146 360 150 350 142 348Z"/>
    <rect x="102" y="488" width="16" height="28" rx="3" fill="#2c2118"/>
    <rect x="107" y="514" width="6" height="18" rx="2" fill="#c0b8a8"/>
    <path fill="url(#celloBoard)" d="M98 214 L122 214 L118 70 L102 70 Z"/>
    <path fill="url(#celloWood)" stroke="#2a140c" d="M100 70 L120 70 L124 38 C128 22 118 10 110 8 C102 10 92 22 96 38 Z"/>
    <circle cx="100" cy="48" r="5" fill="#d4af6a"/>
    <circle cx="120" cy="42" r="5" fill="#d4af6a"/>
    <circle cx="100" cy="30" r="5" fill="#8a6a3a"/>
    <circle cx="120" cy="24" r="5" fill="#8a6a3a"/>
    <polygon fill="#5a4030" points="96,336 124,336 118,352 102,352"/>
    <polygon fill="#2a1c14" points="100,478 120,478 116,352 104,352"/>
    <g class="strings" stroke="#f3ead8" stroke-linecap="round">
      <line class="string s1" x1="104" y1="72" x2="105" y2="350" stroke-width="0.9"/>
      <line class="string s2" x1="108" y1="72" x2="108.5" y2="350" stroke-width="1"/>
      <line class="string s3" x1="112" y1="72" x2="111.5" y2="350" stroke-width="1.15"/>
      <line class="string s4" x1="116" y1="72" x2="115" y2="350" stroke-width="1.3"/>
    </g>
  </g>
  <g class="bow">
    <rect x="150" y="200" width="6" height="210" rx="2" fill="url(#bowStick)"/>
    <rect x="147" y="196" width="12" height="14" rx="2" fill="#1c120c"/>
    <rect x="148" y="404" width="10" height="16" rx="2" fill="#ece4d4"/>
    <path d="M154 210 L162 410" stroke="#f7f1e4" stroke-width="1.2" opacity="0.85"/>
  </g>
</svg>`;
}

function violinSvg() {
  return `
<svg class="inst inst-violin" viewBox="0 0 200 460" aria-hidden="true">
  <defs>
    <linearGradient id="violinWood" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6a2430"/>
      <stop offset="0.3" stop-color="#b24a58"/>
      <stop offset="0.55" stop-color="#e08b86"/>
      <stop offset="0.75" stop-color="#8a303c"/>
      <stop offset="1" stop-color="#3a1218"/>
    </linearGradient>
    <linearGradient id="violinGloss" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/>
      <stop offset="0.4" stop-color="#fff" stop-opacity="0.32"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.2"/>
    </linearGradient>
    <linearGradient id="violinBoard" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#1a1210"/>
      <stop offset="0.5" stop-color="#3a2a22"/>
      <stop offset="1" stop-color="#120c0a"/>
    </linearGradient>
    <linearGradient id="vbow" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e6c98a"/>
      <stop offset="1" stop-color="#6a4a28"/>
    </linearGradient>
  </defs>
  <g class="instrument-body">
    <ellipse class="glow-pool" cx="100" cy="300" rx="66" ry="22" fill="currentColor" opacity="0.22"/>
    <path fill="url(#violinWood)" stroke="#3a1018" stroke-width="1.1" d="M100 186
      C132 186 148 208 148 234 C148 254 138 266 132 276
      C146 290 158 312 158 336 C158 380 132 414 100 414
      C68 414 42 380 42 336 C42 312 54 290 68 276
      C62 266 52 254 52 234 C52 208 68 186 100 186Z"/>
    <path fill="url(#violinGloss)" d="M100 190 C128 190 142 212 142 234 C142 258 128 270 118 280 L110 274 C118 264 128 254 128 236 C128 216 116 198 100 198Z" opacity="0.7"/>
    <path fill="#14080c" d="M72 300 C72 290 80 286 84 294 C86 302 80 310 80 320 C80 332 88 340 82 346 C74 346 68 334 68 322 C68 312 66 304 72 300Z"/>
    <path fill="#14080c" d="M128 300 C128 290 120 286 116 294 C114 302 120 310 120 320 C120 332 112 340 118 346 C126 346 132 334 132 322 C132 312 134 304 128 300Z"/>
    <path fill="url(#violinBoard)" d="M90 188 L110 188 L107 58 L93 58 Z"/>
    <path fill="url(#violinWood)" stroke="#3a1018" d="M92 58 L108 58 L112 30 C116 16 108 8 100 6 C92 8 84 16 88 30 Z"/>
    <circle cx="91" cy="40" r="4.4" fill="#e8c87a"/>
    <circle cx="109" cy="34" r="4.4" fill="#e8c87a"/>
    <circle cx="91" cy="24" r="4.4" fill="#c08950"/>
    <circle cx="109" cy="18" r="4.4" fill="#c08950"/>
    <polygon fill="#5a3034" points="88,288 112,288 108,302 92,302"/>
    <polygon fill="#2a1416" points="91,404 109,404 106,302 94,302"/>
    <g class="strings" stroke="#f8eee6" stroke-linecap="round">
      <line class="string s1" x1="95" y1="60" x2="95.5" y2="300" stroke-width="0.8"/>
      <line class="string s2" x1="98.5" y1="60" x2="98.8" y2="300" stroke-width="0.9"/>
      <line class="string s3" x1="102" y1="60" x2="101.6" y2="300" stroke-width="1.05"/>
      <line class="string s4" x1="105.5" y1="60" x2="105" y2="300" stroke-width="1.2"/>
    </g>
  </g>
  <g class="bow">
    <rect x="138" y="170" width="5" height="180" rx="2" fill="url(#vbow)"/>
    <rect x="135" y="166" width="11" height="12" rx="2" fill="#1c120c"/>
    <rect x="136" y="344" width="9" height="14" rx="2" fill="#f0e8d8"/>
    <path d="M141 178 L148 350" stroke="#fff8ee" stroke-width="1.1" opacity="0.85"/>
  </g>
</svg>`;
}

function fluteSvg() {
  return `
<svg class="inst inst-flute" viewBox="0 0 560 150" aria-hidden="true">
  <defs>
    <linearGradient id="fluteBody" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e8fbff"/>
      <stop offset="0.35" stop-color="#9ad4cc"/>
      <stop offset="0.5" stop-color="#d9f3ef"/>
      <stop offset="0.8" stop-color="#5e9e9a"/>
      <stop offset="1" stop-color="#2d5c5a"/>
    </linearGradient>
    <linearGradient id="fluteShine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0.7"/>
      <stop offset="0.4" stop-color="#fff" stop-opacity="0.05"/>
    </linearGradient>
  </defs>
  <g class="instrument-body">
    <ellipse class="glow-pool" cx="280" cy="92" rx="200" ry="18" fill="currentColor" opacity="0.2"/>
    <rect x="36" y="58" width="500" height="28" rx="14" fill="url(#fluteBody)" stroke="#4d7d7a" stroke-width="0.8"/>
    <rect x="40" y="60" width="490" height="8" rx="4" fill="url(#fluteShine)"/>
    <rect x="20" y="62" width="24" height="20" rx="8" fill="#cfeae6" stroke="#4d7d7a"/>
    <circle class="embouchure" cx="70" cy="72" r="6" fill="#163230"/>
    <g class="keys" fill="#d7f2ee" stroke="#3d6664" stroke-width="0.7">
      <circle cx="160" cy="72" r="6.5"/>
      <circle cx="200" cy="72" r="6.5"/>
      <circle cx="240" cy="72" r="6.5"/>
      <circle cx="288" cy="72" r="6.5"/>
      <circle cx="328" cy="72" r="6.5"/>
      <circle cx="368" cy="72" r="6.5"/>
      <circle cx="416" cy="72" r="6"/>
      <circle cx="452" cy="72" r="6"/>
      <rect x="175" y="54" width="22" height="6" rx="2"/>
      <rect x="255" y="54" width="22" height="6" rx="2"/>
      <rect x="340" y="54" width="22" height="6" rx="2"/>
    </g>
    <g class="notes-particles" fill="currentColor">
      <g class="note n1"><ellipse cx="64" cy="40" rx="4" ry="3"/><rect x="67" y="18" width="1.4" height="22"/></g>
      <g class="note n2"><ellipse cx="86" cy="32" rx="4" ry="3"/><rect x="89" y="10" width="1.4" height="22"/></g>
      <g class="note n3"><ellipse cx="50" cy="28" rx="3.4" ry="2.6"/><rect x="52.6" y="8" width="1.3" height="20"/></g>
      <g class="note n4"><ellipse cx="78" cy="22" rx="3.4" ry="2.6"/><rect x="80.6" y="2" width="1.3" height="20"/></g>
    </g>
  </g>
</svg>`;
}

function uniqueSvg(svg, suffix) {
  return svg
    .replace(/id="([^"]+)"/g, (_m, id) => `id="${id}-${suffix}"`)
    .replace(/url\(#([^)]+)\)/g, (_m, id) => `url(#${id}-${suffix})`);
}

function instrumentMarkup(kind, { live = false, layerId = '', label = '' } = {}) {
  const raw = kind === 'flute' ? fluteSvg() : kind === 'violin' ? violinSvg() : celloSvg();
  const suffix = (layerId || (live ? 'live' : 'x')).replace(/[^a-z0-9-]/gi, '');
  const svg = uniqueSvg(raw, suffix);
  const title = label || kind;
  const controls = live ? '' : `
    <div class="player-controls">
      <button type="button" class="icon-btn mute-btn" data-action="mute" data-id="${layerId}" aria-label="Mute ${title}">Mute</button>
      <button type="button" class="icon-btn undo-btn" data-action="remove" data-id="${layerId}" aria-label="Remove ${title}">Undo</button>
    </div>`;
  return `
    <div class="player-inner">
      ${svg}
      <p class="player-label">${title}</p>
      ${controls}
    </div>`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { celloSvg, violinSvg, fluteSvg, instrumentMarkup };
}
if (typeof window !== 'undefined') {
  window.BreathLib = Object.assign(window.BreathLib || {}, { celloSvg, violinSvg, fluteSvg, instrumentMarkup });
}
