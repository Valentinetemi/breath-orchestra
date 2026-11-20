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

function pianoKeyNotes() {
  const whites = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'];
  const blacks = [
    { note: 'Db3', after: 0 }, { note: 'Eb3', after: 1 },
    { note: 'Gb3', after: 3 }, { note: 'Ab3', after: 4 }, { note: 'Bb3', after: 5 },
    { note: 'Db4', after: 7 }, { note: 'Eb4', after: 8 },
    { note: 'Gb4', after: 10 }, { note: 'Ab4', after: 11 }, { note: 'Bb4', after: 12 },
  ];
  return { whites, blacks };
}

function pianoSvg() {
  const { whites, blacks } = pianoKeyNotes();
  const originX = 148;
  const originY = 178;
  const whiteW = 13.2;
  const whiteH = 46;
  const whiteKeys = whites.map((note, i) => {
    const x = originX + i * whiteW;
    return `<rect class="piano-key white" data-note="${note}" x="${x.toFixed(1)}" y="${originY}" width="12.4" height="${whiteH}" rx="1.4"/>`;
  }).join('');
  const blackKeys = blacks.map(({ note, after }) => {
    const x = originX + (after + 1) * whiteW - 4.4;
    return `<rect class="piano-key black" data-note="${note}" x="${x.toFixed(1)}" y="${originY}" width="8.2" height="28" rx="1"/>`;
  }).join('');
  return `
<svg class="inst inst-piano" viewBox="0 0 520 280" aria-hidden="true">
  <defs>
    <linearGradient id="pianoEbony" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2a2420"/>
      <stop offset="0.35" stop-color="#4a4038"/>
      <stop offset="0.6" stop-color="#1a1614"/>
      <stop offset="1" stop-color="#0c0a08"/>
    </linearGradient>
    <linearGradient id="pianoLid" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="#1c1814"/>
      <stop offset="0.4" stop-color="#3a322c"/>
      <stop offset="1" stop-color="#0e0c0a"/>
    </linearGradient>
    <linearGradient id="pianoGold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f3e2b0"/>
      <stop offset="1" stop-color="#9a7a3a"/>
    </linearGradient>
    <linearGradient id="pianoCheek" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#3a322c"/>
      <stop offset="1" stop-color="#1a1612"/>
    </linearGradient>
  </defs>
  <g class="instrument-body">
    <ellipse class="glow-pool" cx="270" cy="236" rx="150" ry="22" fill="currentColor" opacity="0.22"/>
    <rect class="leg" x="176" y="214" width="10" height="46" rx="2" fill="#1a1410"/>
    <rect class="leg" x="400" y="210" width="10" height="50" rx="2" fill="#1a1410"/>
    <rect class="leg" x="300" y="200" width="9" height="40" rx="2" fill="#161210"/>
    <path fill="url(#pianoEbony)" stroke="#0a0806" stroke-width="1.1" d="
      M150 168
      C150 150 168 138 200 132
      C280 118 360 88 430 70
      C470 60 500 78 492 108
      C478 160 430 186 360 198
      L360 214
      L150 220 Z"/>
    <path fill="url(#pianoLid)" opacity="0.95" d="
      M198 128
      C278 114 360 84 428 68
      C455 62 478 70 470 92
      C456 128 400 148 330 156
      C260 164 210 156 198 128 Z"/>
    <path fill="url(#pianoGold)" opacity="0.55" d="
      M214 130
      C286 118 360 90 420 76
      C430 88 400 118 338 130
      C276 142 230 140 214 130 Z"/>
    <path d="M336 128 L336 86 L352 78" fill="none" stroke="#c4a05a" stroke-width="2.2" stroke-linecap="round"/>
    <rect x="140" y="166" width="236" height="58" rx="6" fill="url(#pianoCheek)"/>
    <rect x="146" y="174" width="200" height="52" rx="3" fill="#12100e"/>
    <g class="piano-keys white-keys">${whiteKeys}</g>
    <g class="piano-keys black-keys">${blackKeys}</g>
    <rect x="146" y="174" width="200" height="5" fill="#2a221c"/>
    <path d="M332 168 L360 164 L360 214 L332 218 Z" fill="#2c2620"/>
  </g>
</svg>`;
}

function drumsSvg() {
  return `
<svg class="inst inst-drums" viewBox="0 0 420 310" aria-hidden="true">
  <defs>
    <linearGradient id="drumShell" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c45a4a"/>
      <stop offset="0.45" stop-color="#8a2828"/>
      <stop offset="1" stop-color="#4a1214"/>
    </linearGradient>
    <linearGradient id="drumHead" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f6f0e4"/>
      <stop offset="0.6" stop-color="#d8cbb6"/>
      <stop offset="1" stop-color="#a89880"/>
    </linearGradient>
    <linearGradient id="cymbalBrass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f3e2a8"/>
      <stop offset="0.5" stop-color="#c4a05a"/>
      <stop offset="1" stop-color="#7a5a22"/>
    </linearGradient>
    <linearGradient id="chrome" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8a8a8a"/>
      <stop offset="0.5" stop-color="#e8e8e8"/>
      <stop offset="1" stop-color="#5a5a5a"/>
    </linearGradient>
  </defs>
  <g class="instrument-body">
    <ellipse class="glow-pool" cx="210" cy="286" rx="130" ry="16" fill="currentColor" opacity="0.2"/>
    <g class="hardware" stroke="url(#chrome)" stroke-width="3" fill="none" stroke-linecap="round">
      <line x1="118" y1="86" x2="118" y2="210"/>
      <line x1="302" y1="96" x2="302" y2="220"/>
      <line x1="78" y1="150" x2="78" y2="230"/>
    </g>
    <g class="kick">
      <ellipse cx="210" cy="214" rx="78" ry="78" fill="url(#drumShell)" stroke="#3a1010" stroke-width="1.2"/>
      <ellipse class="drumhead head-kick" cx="210" cy="214" rx="62" ry="62" fill="url(#drumHead)" stroke="#d8cbb6" stroke-width="2"/>
      <ellipse cx="210" cy="200" rx="22" ry="16" fill="#fff8" opacity="0.35"/>
    </g>
    <g class="floor-tom">
      <rect x="286" y="186" width="54" height="58" rx="6" fill="url(#drumShell)" stroke="#3a1010"/>
      <ellipse class="drumhead head-tom head-floor" cx="313" cy="186" rx="28" ry="12" fill="url(#drumHead)" stroke="#c8b89a"/>
      <line x1="296" y1="244" x2="296" y2="268" stroke="url(#chrome)" stroke-width="3"/>
      <line x1="330" y1="244" x2="330" y2="268" stroke="url(#chrome)" stroke-width="3"/>
    </g>
    <g class="rack-toms">
      <rect x="168" y="132" width="40" height="36" rx="5" fill="url(#drumShell)"/>
      <ellipse class="drumhead head-tom head-tom-l" cx="188" cy="132" rx="21" ry="9" fill="url(#drumHead)" stroke="#c8b89a"/>
      <rect x="214" y="126" width="44" height="38" rx="5" fill="url(#drumShell)"/>
      <ellipse class="drumhead head-tom head-tom-r" cx="236" cy="126" rx="23" ry="9" fill="url(#drumHead)" stroke="#c8b89a"/>
    </g>
    <g class="snare">
      <rect x="108" y="188" width="62" height="28" rx="4" fill="#c4b49a" stroke="#4a3a28"/>
      <rect x="108" y="198" width="62" height="8" fill="#8a7a62"/>
      <ellipse class="drumhead head-snare" cx="139" cy="188" rx="32" ry="12" fill="url(#drumHead)" stroke="#c8b89a"/>
      <line x1="120" y1="216" x2="112" y2="246" stroke="url(#chrome)" stroke-width="3"/>
      <line x1="156" y1="216" x2="164" y2="246" stroke="url(#chrome)" stroke-width="3"/>
    </g>
    <g class="cym-hat">
      <ellipse class="cymbal cym-hat" cx="78" cy="150" rx="36" ry="8" fill="url(#cymbalBrass)" stroke="#8a6a28"/>
      <ellipse cx="78" cy="148" rx="10" ry="2.5" fill="#f8e8b0"/>
    </g>
    <g class="cym-crash">
      <ellipse class="cymbal cym-crash" cx="118" cy="86" rx="48" ry="10" fill="url(#cymbalBrass)" stroke="#8a6a28" transform="rotate(-16 118 86)"/>
      <ellipse cx="118" cy="86" rx="8" ry="2.2" fill="#f8e8b0"/>
    </g>
    <g class="cym-ride">
      <ellipse class="cymbal cym-ride" cx="302" cy="96" rx="52" ry="11" fill="url(#cymbalBrass)" stroke="#8a6a28" transform="rotate(14 302 96)"/>
      <ellipse cx="302" cy="96" rx="8" ry="2.2" fill="#f8e8b0"/>
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
  const raw = kind === 'flute' ? fluteSvg()
    : kind === 'violin' ? violinSvg()
    : kind === 'piano' ? pianoSvg()
    : kind === 'drums' ? drumsSvg()
    : celloSvg();
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
  module.exports = { celloSvg, violinSvg, fluteSvg, pianoSvg, drumsSvg, instrumentMarkup };
}
if (typeof window !== 'undefined') {
  window.BreathLib = Object.assign(window.BreathLib || {}, { celloSvg, violinSvg, fluteSvg, pianoSvg, drumsSvg, instrumentMarkup });
}
