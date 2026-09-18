# sound-blend-cut 🎙️

A local, offline browser-based audio editing workstation designed specifically for **American English language teaching**, **phonics blending lessons**, and **natural vowel prolongation**.

Built to solve the distortion problems in typical audio tools: **zero robotic voice**, **zero electrical buzzing**, **zero comb-filter phasing**, and **zero sound overlapping**.

---

## ✨ Key Features

### 1. Phonics Sound Blending (Sequential Phoneme Stretching)
- Designed for phonics instruction (e.g. teaching *s-a-t* $\rightarrow$ *"ssss-aaaa-t"*).
- Uses **TD-PSOLA (Time-Domain Pitch-Synchronous Overlap-Add)** as the primary speech engine.
- Elongates each phoneme sequentially with **zero overlap** onto adjacent sounds and **zero pitch drop**.
- Also includes **Tape Resample Slowdown** (pitch drops naturally with speed) and **Classic WSOLA** options.

### 2. Natural Vowel Prolongation (Vowel Sustain)
- Surgical 3-segment vowel elongation (e.g., turning *"most"* into *"Mooooossstt"*).
- The consonant onset (*"M"*) is **100% untouched** — zero electrical buzz or stutter.
- The vowel nucleus is prolonged using pitch-synchronous glottal cycle alignment, preserving the speaker's exact voice, pitch, and mouth shape/timbre.
- The consonant coda (*"st"*) is **100% untouched** — crisp, natural ending.
- One-click **⚡ Auto-Detect** vowel boundary identification using short-time energy and zero-crossing analysis.

### 3. Professional Multi-Track Timeline & Waveforms
- Multi-track audio timeline with non-destructive trimming, dragging, and splitting (`S` key).
- Accurate waveforms displaying only the active/trimmed region of each clip.
- Track controls: Volume faders, Mute (M), and Solo (S) buttons.
- Precise playhead boundary enforcement (halts exactly when audio finishes).

### 4. 5-Band Parametric Equalizer (EQ)
- Interactive real-time visual EQ curve.
- 5 bands: 80 Hz (Low Shelf), 250 Hz (Low-Mid), 1 kHz (Mid), 3.5 kHz (High-Mid), 10 kHz (High Shelf).
- One-click speech clarity presets: *Voice Clarity*, *Warmth*, *Crisp Diction*, and *Flat*.

### 5. High-Contrast Light & Dark Themes
- Professional Light and Dark mode toggle (`☀️ Light` / `🌙 Dark`).
- Full semantic token architecture: zero text merging with backgrounds, zero invisible overlays.
- HTML5 canvases (Timeline, Waveforms, Ruler, EQ) dynamically redraw based on active theme.
- Remembers user preference via `localStorage`.

### 6. 100% Offline Multi-Format Export
- Defaults to **MP3 (192 kbps)** powered by embedded `lamejs`.
- Lossless **WAV (16-bit PCM)** export available.
- **Smart Deduplication**: Automatically increments filename counter (`_01.mp3`, `_02.mp3`, etc.) to prevent accidental overwrites.
- Quick tag buttons: `+ Number`, `+ Timestamp`, `+ Random ID`, `Base Name`.
- In-dialog audition player to preview the mixdown before saving.

### 7. Universal Drag & Drop
- Drag files directly from Windows Explorer or OS desktop onto the timeline or media library.
- Full support for files with empty OS MIME types (`.wav`, `.mp3`, `.m4a`, `.flac`, `.ogg`, `.webm`, `.mp4`).

---

## 🚀 Quick Start

This application runs **100% locally in any modern browser** (Chrome, Edge, Firefox, Safari) without requiring node, python, or an internet connection.

### Option A: Open directly in your browser
Simply double-click **`index.html`** or **`IXR_Studio.html`** to launch.

### Option B: Serve locally
```bash
# Using Python
python -m http.server 8080

# Or using Node
npx serve .
```
Then navigate to `http://localhost:8080`.

### Option C: Deploy to Vercel
Import this repository directly into [Vercel](https://vercel.com). The repository includes pre-configured `vercel.json` and `package.json` for instant zero-configuration deployment on Vercel's global Edge CDN.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Space` | Play / Pause |
| `S` | Split clip at playhead position |
| `Delete` | Delete selected clip |
| `Ctrl + Z` | Undo |
| `Ctrl + Y` | Redo |
| `[` / `]` | Move playhead backward / forward by 0.1s |
| `Home` | Rewind playhead to start (0:00) |
| `+` / `-` | Zoom in / Zoom out timeline |
| `Ctrl + Wheel` | Zoom timeline centered at cursor |
| `V` | Toggle video preview panel |
| `E` | Toggle 5-band EQ panel |

---

## 🔬 Technology & Architecture

- **TD-PSOLA Engine**: Time-Domain Pitch-Synchronous Overlap-Add algorithm for human speech time-stretching with pitch preservation and glottal pulse synchronization.
- **Web Audio API**: Real-time multi-track playback, parametric biquad filtering, gain nodes, and dynamic buffer rendering.
- **LAME MP3 Encoder**: Offline MP3 compression via `lame.min.js`.
- **SoundTouch**: WSOLA DSP engine for polyphonic stretching via `soundtouch.js`.
- **Zero External Runtime Dependencies**: Entirely self-contained client-side application.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
