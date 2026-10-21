# Reveal video sources

The reveal video at `/reveal` (`public/reveal/nearlife-reveal.mp4`) is rendered from these files.

- `site/index.html`: the 1920×1080 animation. `window.render(t)` draws the frame at time `t`. The game screenshots in `site/img/` were captured from the running game; `shift.cjs` was preloaded into the server (`NODE_OPTIONS=--require ./shift.cjs`) so the game clock reads daytime.
- `render.mjs`: steps the page at 30 fps in headless Chromium and pipes the frames to ffmpeg.
- `lines.json`, `ph.mjs`, `tts.py`: the voiceover script and its synthesis. Phonemes come from kokoro-js's eSpeak phonemizer. Speech comes from the Kokoro-82M ONNX model (Apache-2.0, npm `kokoro-q8-shards`) with the `af_heart` voice, run through onnxruntime.
- `audio.py`: synthesizes the music and sound effects in numpy, then mixes and ducks them under the voice into `mix.wav`.

Fonts: Lilita One and Nunito (SIL Open Font License). Project logos belong to their owners (see the main README).
