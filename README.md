# Breath Orchestra

A webcam instrument for the [Presage SmartSpectra SDK Challenge](https://dev.to/challenges/presage-2026-11-04). Pick a cello, flute, or violin, and let your breath swell the phrase. Loop that part, switch instruments, and layer a small orchestra on a concert-hall stage.

The music stays in **D minor** at **72 BPM**, and every loop snaps to a whole bar, so it still sounds musical on a first try. A short calibration learns *your* breath range, so a shallow breather and a deep breather both get a full swell.

This is a musical instrument, not a medical device. It does not diagnose or treat anything.

## Requirements (macOS Apple Silicon)

- A Mac with Apple Silicon (the Node SDK supports `darwin-arm64`)
- macOS 14 or later recommended
- [Node.js 20+](https://nodejs.org/) (Node 24 is fine)
- A built-in or USB webcam, on a desk — breathing needs a still camera
- For a live camera session: a free SmartSpectra API key

Practice mode needs no key, no camera, and no SDK credits. Hold **Space** or the mouse button to breathe in, release to breathe out.

## Setup

```bash
git clone https://github.com/Valentinetemi/breath-orchestra.git
cd breath-orchestra
npm install
```

The SmartSpectra SDK is an optional dependency. If `npm install` prints a warning about it, Practice mode will still run.

### Camera sessions

1. Register for a free key at [the Presage developer portal](https://physiology.presagetech.com/auth/register) and confirm your email.
2. Copy the example env file and paste your key. Never commit the real file.

```bash
cp .env.example .env
```

3. Open `.env` and set:

```
SMARTSPECTRA_API_KEY=your_key_here
```

4. Start the app:

```bash
npm start
```

On first launch, macOS will ask for camera permission. Breath Orchestra declares `NSCameraUsageDescription` in its bundle info: the camera is used to read the movement of your chest as you breathe, and video never leaves this computer.

If the camera track appears “live” but stays black, check which app actually launched Electron — macOS attaches the permission to the parent app (Terminal, Cursor, etc.). Grant camera access to that app in **System Settings → Privacy & Security → Camera**, then restart.

### Practice without a camera

```bash
npm start
```

On the consent screen, choose **Practice without a camera**. No `.env` file is required.

```bash
npm run start:sim
```

does the same, and also passes a `--sim` flag.

## How to play

1. Read the consent card. The camera stays off until you choose **Use my camera**.
2. After the curtain opens, breathe normally for about 15 seconds while the stage lights warm with your breath. This is only learning your range — not a score.
3. Pick cello, flute, or violin from the playbill.
4. Breathe. The instrument under the spotlight swells on the inhale and fades on the exhale.
5. Press **Record** (or `R`). Recording starts on the next bar. Press it again to sit that player on the stage. Loops are snapped to whole bars.
6. Switch instruments and record another part. You can seat more than one cello (or flute, or violin) in different places.
7. **Mute** or **Undo** on a seated player dims or removes it. `Cmd+Z` undoes the last part.

Talking, or a framing warning from the SDK, pauses an in-progress recording and writes a rest so the other parts stay on the grid. If the swell feels backwards, tick **Invert breath**.

### Lighting and framing

Breathing is read from chest movement, so a still, well-lit picture matters more than anything else:

- Sit at a desk, about an arm’s length from a laptop webcam (around 36–39 inches if you can).
- Keep your **face and upper chest** in the frame, looking toward the camera.
- Use even, front or slightly off-axis light. Avoid a bright window behind you, a dark room, or a flickering TV as the main light.
- Prefer plain, lighter clothing over an all-dark shirt or tight high-contrast stripes.
- Stay fairly still, and avoid talking while you record a part.
- Ordinary glasses are usually fine; sunglasses or heavy glare can make face tracking harder.

The small preview in the corner shows the SDK’s own framing hints when you use the camera.

## Scripts

```bash
npm start           # build nothing extra; open the Electron app
npm run start:sim   # same, with the --sim flag
npm test            # unit tests for calibration, quantization, and the looper
npm run test:headless
npm run lint
```

## Privacy

- The camera never starts from the consent screen.
- Video is processed on this computer. Breath Orchestra does not store video, write recordings to disk, or send frames to another person.
- Loop envelopes live in memory and disappear when you quit.
- SmartSpectra telemetry is **off by default**. If you opt in, the SDK may send session summaries and device-readiness reports (no video and no breath or pulse values). See [Telemetry and Privacy](https://smartspectra.presagetech.com/docs/telemetry-and-privacy).
- A live session still contacts Presage to check your API key and credits.

## Credits and licenses

See [LICENSES.md](LICENSES.md).

## Challenge notes

Submission post draft: [DEV_POST.md](DEV_POST.md).

The official Node/Electron SDK is documented at [smartspectra.presagetech.com/docs/nodejs](https://smartspectra.presagetech.com/docs/nodejs). Live camera measurement is intended to be verified on macOS Apple Silicon. Practice mode and the unit tests run on other platforms, including Linux.
