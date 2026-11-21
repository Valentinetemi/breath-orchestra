---
title: "Breath Orchestra: I built a concert hall you play with your breath"
published: false
tags: devchallenge, presagechallenge
---

*This is a submission for the [Presage SmartSpectra SDK Challenge](https://dev.to/challenges/presage-2026-11-04)*

## What I Built

Breath Orchestra is a webcam instrument set in a little concert hall. You pick a cello, a flute, a violin, a piano, or drums, and your breath shapes how the phrase swells and fades. When the part feels right, you record it. The take is snapped to the next bar, and that instrument stays seated with the rest of the ensemble — strings at the front, piano to one side, drums on a riser at the back — still playing the loop you made. Then you switch instruments, or add another cello beside the first, and layer a new part over it, until a small band is sitting together in the light.

I wanted it to work for someone who has never played an instrument, and for someone whose breath is naturally shallow or deep. Before any music starts, there is a short calibration: “Breathe normally, we're learning your range.” The app learns the 5th-to-95th percentile of your chest-movement trace, then maps that personal range to a full swell. The music itself stays locked to D minor at 72 BPM, so whatever you do, it still sounds like a piece, not a jumble of notes.

<!-- TEMI: Add 2–4 sentences in your own voice about why you wanted to build this. What made a concert hall you play with your breath feel like the right idea? You can mention neuroscience or The Biology of Connection if you want, but only in your words. Replace this comment and keep the rest of the post in first person. -->

It is a musical instrument, not a medical tool. It does not diagnose or treat anything.

## Demo

<!-- TEMI: After you record the demo on your Mac, paste the video embed or link here. A good take walks through consent, calibration, one recorded part, a second instrument, and mute/undo. -->

**Demo video:** _coming soon_

Practice mode (no API key, no camera) is clearly labelled on the consent screen. Hold Space or the mouse button to breathe in. Judges who want a live camera session can follow the setup in the README.

## Code

<!-- TEMI: After you publish the GitHub repository, put the public URL here. -->

**Repository:** https://github.com/Valentinetemi/breath-orchestra

Setup is in the README. The short version on a Mac with Apple Silicon:

```bash
git clone https://github.com/Valentinetemi/breath-orchestra.git
cd breath-orchestra
npm install
cp .env.example .env   # add your free SmartSpectra API key for camera mode
npm start
```

`npm start` alone is enough for Practice mode. `npm test` runs the calibration, quantization, and looper tests.

## How It Responds to Human Signals

The lead signal is SmartSpectra’s **chest breathing waveform** (`breathing.upperTrace` / `CHEST_BREATHING`), not the 30-second breathing *rate*. The trace is a frame-driven movement signal, updated near camera cadence (about 30 Hz). I use it as a live envelope: inhale swells the instrument in its section, exhale lets it fade. The cello and violin bows travel with that envelope and the strings shimmer; the flute lets little notes drift up from the embouchure; the piano keys light and press with the current D-minor chord.

A **15-second calibration** learns each person’s 5th–95th percentile and keeps a slow rolling update afterwards, so a later deeper breath can widen the range without a cough blowing the scale. Slope detection with hysteresis labels inhale, exhale, and hold. If the polarity feels backwards, there is an invert toggle.

I also listen to:

- **`validationStatus`**, including the SDK’s own hint text, for the small framing preview and to pause a recording if the picture isn’t good.
- **`face.talking`**, so talking pauses an in-progress take (the SDK’s breathing model is thrown off by speech). Paused time is written as silence so the other parts stay on the grid.

Breath is still the main gesture, and the music itself never leaves D minor at 72 BPM. Breath alone makes a poor drum controller, so the kit uses a second signal: your **pulse**. I read `cardio.pulseRate` and the `cardio.arterialPressureTrace` (the uncalibrated arterial-pressure waveform). Those values only change how busy or accented the groove is — a little denser when the pulse is quicker, a little more marked when a beat lands near a grid point — and they never move the tempo. A deep inhale can swell the ride or crash and add a short fill into the next bar. In Practice mode I simulate a pulse, so the drums still play without a camera. This is not a heart-rate monitor, and it is not a reading of health.

On the consent screen you can choose **Practice without a camera**. That path never opens the camera and never spends SDK credits. It feeds a synthetic breath waveform, and a simulated pulse, into the same calibrator, looper, and instruments, and you can also drive the breath with the keyboard or mouse.

For a live session I follow Presage's Electron sample: the main process calls `bindSmartSpectraIpc`, the preload loads the SDK bridge, and the renderer creates a `SmartSpectraSDK` from `@smartspectra/node-sdk/renderer` only after camera consent, with `enableTelemetry` off unless you opted in. The SDK opens the camera through Electron's permission handler (camera only, only for the app's own page), and on macOS the app asks for camera access first. It requests the breathing bundle plus talking and pulse, and each `breathing.upperTrace` sample goes straight into the calibrator. If anything goes wrong (missing SDK, rejected key, camera denied, or no breath data after 10 seconds) the app says so on screen and drops into Practice mode rather than faking it. The API key is read from a gitignored `.env` and is never written into the repo or the UI.

## Prize Categories

I am entering both prize categories (and the overall pool).

### Most Creative or Delightful Use

<!-- TEMI: If you want this paragraph to sound more like you, rewrite this subsection in your words. Keep the facts. -->

I didn’t want another dashboard of numbers, or a single pad that brightens when you inhale. I wanted a room you could walk into: velvet curtains, a wooden stage, and a little ensemble sitting together — cello, violin, flute, piano, and drums — each still playing the part you just breathed. The delight is in the layering: a cello already seated at the front, a piano at the side whose keys follow the phrase, and drums on the riser keeping time while you add the next line.

### Best Thoughtful Real-World Use

Breath Orchestra is for anyone who wants to make something that sounds like music without having to know how to play, and without being scored or diagnosed. That includes a first-timer, a shallow breather, and someone who would rather practise without a camera at all.

I designed it that way on purpose: consent before the camera, a calibration that adapts to the person instead of assuming a “normal” breath size, music locked to one key and one tempo, loops quantized to bars, plain-language framing help, and a practice mode that uses the same instrument as the live path. Recording pauses honestly if you talk or if the picture slips, and you can undo a part without starting over.

## Consent and Data Handling

- **Camera consent.** The camera stays off on launch. Nothing calls `start()` on the SDK, and Electron will not grant the camera permission, until you tick the consent box and choose **Use my camera**. Practice mode never opens the camera. Closing the window stops the session and turns the camera off.
- **What is measured.** In camera mode, the SDK looks at the movement of your chest (and can notice talking). It can also read a pulse rate and an arterial-pressure trace. The app uses those signals only to play music: breath swells the phrase, and pulse gently shapes the drum groove on a locked tempo. It does not claim to measure health, stress, fitness, or emotion, and it does not diagnose anything.
- **Video.** Frames are processed on your computer. Breath Orchestra does not write video to disk, does not keep a recording of your face, and does not send frames to anyone else. The optional corner preview is local only.
- **Signals and loops.** Breath envelopes live in memory for the current session. Quit, and they are gone. There is no account, no history, and no analytics service of mine.
- **SDK telemetry.** Off by default. If you opt in on the consent screen, the SmartSpectra SDK may send session summaries and device-readiness reports (SDK version, device and OS, frame-rate and validation counts, error codes — not video, and not your breath or pulse values). Those requests are authenticated to the API-key account. Details: [SDK Telemetry & Privacy](https://smartspectra.presagetech.com/docs/telemetry-and-privacy).
- **Presage authentication and credits.** A live session still contacts Presage over TLS to validate the API key and the free-trial credit balance. This challenge runs on that free trial; if you hit a limit, the [Presage Discord](https://discord.com/invite/K7KNmuX7KT) is the official place to ask. The key itself stays in a local, gitignored `.env` file.
- **AI services.** The app does not call SmartSpectra LLM Insights or any other AI API at runtime. No breath data is sent to a language model.
- **Not medical.** For music and wellness only. No diagnosis, treatment, or medical decision-making, and no covert or non-consensual monitoring.

## Agent Session

<!-- Optional: if you later upload a curated agent transcript at https://dev.to/agent_sessions/new, make it public, check it for keys, and embed it here. -->
