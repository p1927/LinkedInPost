# Speech-to-Text Scratchpad — Design Spec
**Date:** 2026-04-23
**Status:** Approved

## Overview

Add optional local speech-to-text (STT) to the "Research notes" scratchpad in `AddTopicPage`. The user speaks; text is inserted at the current cursor position. Fully local — no cloud, no internet required at transcription time. The feature is opt-in: disabled by default, enabled during setup which downloads the Whisper model.

---

## Architecture

### Components

| File | Purpose |
|---|---|
| `frontend/src/features/setup-wizard/SpeechToTextStep.tsx` | New wizard step — toggle enable/disable, model picker, download |
| `frontend/server/setupWizard.js` | Add `POST /api/setup/stt/download` + `GET /api/setup/stt/status` endpoints |
| `frontend/server/sttServer.js` | New local sidecar server (port 3457) — receives audio, runs whisper, returns transcript |
| `frontend/src/features/add-topic/useSpeechToText.ts` | React hook — mic state, MediaRecorder chunking, POST to sidecar, cursor insertion |
| `frontend/src/features/add-topic/MicButton.tsx` | Mic icon button with recording/disabled/unavailable states |
| `frontend/.stt-config.json` | Written by setup, read by sidecar at startup (gitignored) |

### Modified Files

| File | Change |
|---|---|
| `frontend/src/features/setup-wizard/SetupWizard.tsx` | Add `'stt'` step, `speechToText` config, wire `handleSttComplete` |
| `frontend/src/features/add-topic/AddTopicPage.tsx` | Wire `MicButton` + `useSpeechToText` into Research notes section |
| `frontend/package.json` | Add `nodejs-whisper` dep, change `dev` to use `concurrently`, add `stt` script |
| `frontend/.gitignore` | Add `models/whisper/`, `.stt-config.json` |

---

## Data Flow

```
1. User clicks mic button (or presses shortcut)
2. Browser requests microphone permission (one-time)
3. MediaRecorder captures audio in 5-second WebM chunks
4. Each chunk → POST localhost:3457/transcribe (multipart/form-data)
5. sttServer saves chunk to /tmp, runs whisper.cpp via nodejs-whisper
6. Returns { text: "..." }
7. useSpeechToText inserts text at textarea selectionStart (or appends if focus lost)
8. User can keep speaking — next chunk processes while previous inserted
```

---

## Config File: `.stt-config.json`

Written by setup wizard, read by sidecar at startup:

```json
{
  "enabled": true,
  "modelPath": "/abs/path/to/frontend/models/whisper/ggml-base.en.bin",
  "model": "base.en",
  "shortcut": "Mod+Shift+M"
}
```

- `enabled: false` → sidecar starts but returns 503 on `/transcribe`; mic button hidden in UI
- `enabled: true` but model file missing → sidecar returns 503 with `"model_missing"` error; UI shows re-run-setup prompt
- File absent entirely → sidecar assumes `enabled: false`

---

## Setup Wizard Integration

### Step flow change
`welcome → directory → progress → integrations → trending → **stt** → envvars → final`

### `SpeechToTextStep.tsx`
- On mount: reads existing `.stt-config.json` via `GET /api/setup/stt/config` to pre-fill toggle + model (handles re-run case)
- Toggle: "Enable voice input in scratchpad (optional)"
- When enabled: model picker — `base.en` (~142 MB, recommended) or `small.en` (~466 MB, higher accuracy)
- "Download model" button → `POST /api/setup/stt/download` with `{ projectDir, model }`
- Progress shown via polling `GET /api/setup/stt/status` (returns `{ downloaded, total, done }`)
- Skip / "Enable later" button → writes `enabled: false`, advances
- On success → writes `.stt-config.json`, advances to envvars

### `setupWizard.js` new endpoints
- `POST /api/setup/stt/download` — streams model download from HuggingFace whisper.cpp mirror to `{projectDir}/frontend/models/whisper/`, writes `.stt-config.json` on completion
- `GET /api/setup/stt/status` — returns download progress (`downloaded` bytes, `total` bytes, `done` bool)

### `SetupConfig` addition
```ts
speechToText: {
  enabled: boolean;
  model: 'base.en' | 'small.en';
  shortcut: string;
}
```
Default: `{ enabled: false, model: 'base.en', shortcut: 'Mod+Shift+M' }`

### FinalStep
Show STT status: "Speech-to-text: enabled (base.en)" or "Speech-to-text: disabled".

---

## Sidecar Server (`sttServer.js`)

- Express server on port **3457**
- Reads `.stt-config.json` at startup
- `POST /transcribe` — accepts `multipart/form-data` with `audio` file field (WebM)
  - If `enabled: false` → 503 `{ error: "stt_disabled" }`
  - If model missing → 503 `{ error: "model_missing" }`
  - Saves audio to `os.tmpdir()`, converts to WAV via ffmpeg (required dependency, pre-checked), runs `nodejs-whisper`
  - Returns `{ text: "transcribed content here" }`
- `GET /health` — returns `{ ok: true, enabled, modelLoaded }`

### npm run dev change
`package.json` dev script:
```json
"dev": "concurrently \"vite\" \"node server/sttServer.js\""
```
If STT disabled, sidecar still starts but immediately returns 503 — no overhead.

### ffmpeg requirement
sttServer checks for `ffmpeg` on startup; logs a warning if absent (feature degrades gracefully — mic button shows "ffmpeg required" tooltip).

---

## Frontend Hook: `useSpeechToText`

```ts
useSpeechToText(textareaRef: RefObject<HTMLTextAreaElement>): {
  isRecording: boolean;
  isAvailable: boolean;   // false if sidecar 503
  unavailableReason: 'disabled' | 'model_missing' | 'ffmpeg_missing' | null;
  toggle: () => void;
  error: string | null;
}
```

**Behaviour:**
1. On mount: `GET localhost:3457/health` → sets `isAvailable`
2. `toggle()` starts/stops `MediaRecorder` on the default mic
3. Every 5 seconds of audio: stop current recorder, POST chunk, start new recorder
4. On transcript: insert at `textareaRef.current.selectionStart`; if ref lost, append to end
5. Handles `mediaDevices` permission errors gracefully (sets `error`)

---

## Mic Button (`MicButton.tsx`)

States:
- **Hidden** — when `isAvailable === false` and `unavailableReason === 'disabled'` (feature off)
- **Unavailable** (greyed, tooltip) — `model_missing` or `ffmpeg_missing`
- **Idle** — mic icon, ready to record
- **Recording** — pulsing red dot + mic icon, click to stop

Placement: inline in the `SectionDivider` action slot for "Research notes" (same pattern as the "Generate with AI" button in Pros & cons).

---

## Keyboard Shortcut

- Default: `Mod+Shift+M` (`Cmd+Shift+M` on Mac, `Ctrl+Shift+M` on other)
- Loaded from `.stt-config.json` via `/health` response (sidecar exposes it)
- Stored in `localStorage` as `stt_shortcut` for the frontend; setup writes canonical value to JSON
- Global `keydown` listener registered in `useSpeechToText` while hook is mounted
- Shortcut only active when `isAvailable === true`
- Configurable: user can change shortcut in a small inline settings popover on the MicButton (future — out of scope for this spec)

---

## Enable / Disable Paths

### Enable (setup)
1. Run `npm run setup-wizard`
2. Navigate to STT step → toggle on → select model → click Download
3. Setup downloads model, writes `.stt-config.json` with `enabled: true`
4. Restart dev server → sidecar picks up config → `/health` returns `enabled: true`
5. Mic button appears in scratchpad

### Disable
1. Re-run `npm run setup-wizard` → navigate to STT step → toggle off → Save
2. Setup writes `.stt-config.json` with `enabled: false`
3. Next dev server restart → sidecar returns 503 → mic button hidden
4. Model file is **not deleted** (user can re-enable without re-downloading)

### Delete model
Manual: delete `frontend/models/whisper/ggml-base.en.bin`. Sidecar will return `model_missing` on next restart even if `enabled: true`.

---

## Error Handling

| Scenario | Sidecar response | UI behaviour |
|---|---|---|
| STT disabled | 503 `stt_disabled` | Mic button hidden |
| Model file missing | 503 `model_missing` | Mic button greyed, tooltip "Run setup to download model" |
| ffmpeg not found | 503 `ffmpeg_missing` | Mic button greyed, tooltip "Install ffmpeg to use voice input" |
| Mic permission denied | n/a (browser) | Error message below Research notes |
| Transcription failed | 500 | Silent retry once; then show small inline error |
| Chunk too large | 413 | Split into smaller chunks (fallback to 3s) |

---

## Model Reference

| Model | Size | Mac Metal latency (5s audio) | Accuracy |
|---|---|---|---|
| `tiny.en` | ~75 MB | ~150ms | Acceptable |
| `base.en` | ~142 MB | ~300ms | Good (recommended) |
| `small.en` | ~466 MB | ~600ms | Better |

All `.en` variants are English-only, ~30% faster than multilingual equivalents.

---

## Files to Gitignore

```
frontend/models/
frontend/.stt-config.json
```

---

## Out of Scope (this spec)

- Shortcut configuration UI (hardcoded default for now)
- Non-English languages
- Streaming / word-by-word transcription
- STT in fields other than Research notes
