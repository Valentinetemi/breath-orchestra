# Licenses and third-party sources

## Breath Orchestra

The application code, the concert-hall scene, and the illustrated cello, flute,
and violin artwork in `src/renderer` were created for this project and are
released under the MIT License (see `LICENSE`).

The instruments are original SVG illustrations, not traced from a commercial
sample library. They are stylized theatrical drawings, not photographs.

## Typography

- [Cormorant Garamond](https://github.com/CormorantGaramond/Cormorant) by
  Christian Thalmann, SIL Open Font License 1.1.
- [Source Sans 3](https://github.com/adobe-fonts/source-sans) by Paul D.
  Hunt / Adobe, SIL Open Font License 1.1.

Font files are vendored in `assets/fonts/` so the app can run offline. The
OFL text is at https://openfontlicense.org/open-font-license-official-text/.

## Audio

Instrument sounds are original Tone.js synthesizer patches in
`src/renderer/orchestra.js` (MIT, with this project). No third-party audio
samples are bundled. If sampled instruments are added later, record the
source, license, and attribution here before committing the files.

## Runtime dependencies

- [Tone.js](https://tonejs.github.io/) — MIT
- [Electron](https://www.electronjs.org/) — MIT
- [dotenv](https://github.com/motdotla/dotenv) — BSD-2-Clause
- [@smartspectra/node-sdk](https://www.npmjs.com/package/@smartspectra/node-sdk) —
  used under Presage's SDK terms. Metrics are for general wellness and
  informational purposes only and may not be used for medical diagnosis or
  treatment.
