import { useState, useEffect, useRef, useCallback } from 'react';

const STT_URL = 'http://localhost:3457';
const CHUNK_INTERVAL_MS = 5000;
const WASM_MODEL_KEY = 'stt_wasm_model';
const WASM_READY_KEY = 'stt_wasm_ready';

export type UnavailableReason = 'disabled' | 'model_missing' | 'sidecar_offline' | 'wasm_loading' | null;

export interface SpeechToTextState {
  isRecording: boolean;
  isAvailable: boolean;
  unavailableReason: UnavailableReason;
  shortcut: string;
  error: string | null;
  toggle: () => void;
}

/** Decode a webm audio blob and resample to 16 kHz mono Float32Array for Whisper. */
async function blobToFloat32(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await audioCtx.decodeAudioData(arrayBuffer);
  } finally {
    await audioCtx.close().catch(() => {});
  }
  const TARGET_RATE = 16000;
  if (decoded.sampleRate === TARGET_RATE && decoded.numberOfChannels === 1) {
    return decoded.getChannelData(0).slice();
  }
  const offlineCtx = new OfflineAudioContext(
    1,
    Math.ceil(decoded.duration * TARGET_RATE),
    TARGET_RATE,
  );
  const source = offlineCtx.createBufferSource();
  source.buffer = decoded;
  source.connect(offlineCtx.destination);
  source.start(0);
  const resampled = await offlineCtx.startRendering();
  return resampled.getChannelData(0).slice();
}

export function useSpeechToText(): SpeechToTextState {
  const [isAvailable, setIsAvailable] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState<UnavailableReason>('sidecar_offline');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shortcut, setShortcut] = useState('Mod+Shift+M');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeElRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const cursorPositionRef = useRef<number | null>(null);

  // 'sidecar' | 'wasm' | null
  const modeRef = useRef<'sidecar' | 'wasm' | null>(null);
  const wasmWorkerRef = useRef<Worker | null>(null);
  // Resolves the current in-flight WASM transcription promise
  const wasmPendingRef = useRef<((text: string) => void) | null>(null);

  const initWasmWorker = useCallback((modelId: string) => {
    // Terminate any existing worker before creating a new one
    wasmWorkerRef.current?.terminate();
    wasmWorkerRef.current = null;
    modeRef.current = null;

    setIsAvailable(false);
    setUnavailableReason('wasm_loading');

    const worker = new Worker(new URL('./whisperWorker.ts', import.meta.url), { type: 'module' });
    wasmWorkerRef.current = worker;
    let loaded = false;

    worker.onmessage = (e: MessageEvent) => {
      const { type, text } = e.data as { type: string; text?: string };
      if (type === 'ready') {
        loaded = true;
        modeRef.current = 'wasm';
        setIsAvailable(true);
        setUnavailableReason(null);
      } else if (type === 'result') {
        wasmPendingRef.current?.(text ?? '');
        wasmPendingRef.current = null;
      } else if (type === 'error' && !loaded) {
        setUnavailableReason('model_missing');
      }
    };
    worker.onerror = () => {
      if (!loaded) setUnavailableReason('model_missing');
    };

    worker.postMessage({ type: 'load', model: modelId });
  }, []);

  // Attempt WASM if local sidecar is unavailable
  const tryWasm = useCallback(() => {
    const model = localStorage.getItem(WASM_MODEL_KEY);
    const ready = localStorage.getItem(WASM_READY_KEY) === 'true';
    if (model && ready) {
      initWasmWorker(model);
    } else {
      setIsAvailable(false);
      setUnavailableReason('model_missing');
    }
  }, [initWasmWorker]);

  // On mount: probe sidecar first, fall back to WASM
  useEffect(() => {
    let cancelled = false;
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1000;

    const checkHealth = async (attempt: number) => {
      try {
        const r = await fetch(`${STT_URL}/health`);
        const data = await r.json() as { enabled?: boolean; modelLoaded?: boolean; shortcut?: string; unavailableReason?: UnavailableReason };
        if (cancelled) return;
        setShortcut(data.shortcut ?? 'Mod+Shift+M');
        if (data.enabled && data.modelLoaded) {
          modeRef.current = 'sidecar';
          setIsAvailable(true);
          setUnavailableReason(null);
        } else {
          tryWasm();
        }
      } catch {
        if (cancelled) return;
        if (attempt < MAX_RETRIES) {
          setTimeout(() => { if (!cancelled) checkHealth(attempt + 1); }, RETRY_DELAY_MS);
        } else {
          tryWasm();
        }
      }
    };

    checkHealth(0);
    return () => {
      cancelled = true;
      wasmWorkerRef.current?.terminate();
      wasmWorkerRef.current = null;
    };
  }, [tryWasm]);

  // Listen for WASM model becoming available (e.g. downloaded via settings while page is open)
  useEffect(() => {
    const handler = () => {
      if (modeRef.current === 'sidecar') return; // sidecar takes priority
      const model = localStorage.getItem(WASM_MODEL_KEY);
      if (model) initWasmWorker(model);
    };
    window.addEventListener('stt-wasm-ready', handler);
    return () => window.removeEventListener('stt-wasm-ready', handler);
  }, [initWasmWorker]);

  // Track the last focused input/textarea so clicking MicButton doesn't lose the target
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        activeElRef.current = e.target;
        cursorPositionRef.current = e.target.selectionStart ?? e.target.value.length;
      }
    };
    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, []);

  // Insert transcribed text at the saved cursor position
  const insertText = useCallback((text: string) => {
    const el = activeElRef.current;
    if (!el || !text) return;

    const pos = cursorPositionRef.current ?? el.value.length;
    const before = el.value.slice(0, pos);
    const after = el.value.slice(pos);
    const separator = before.length > 0 && !before.endsWith(' ') ? ' ' : '';
    const inserted = separator + text + ' ';
    const newValue = before + inserted + after;
    const newPos = pos + inserted.length;

    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(el, newValue);
      el.selectionStart = newPos;
      el.selectionEnd = newPos;
      cursorPositionRef.current = newPos;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, []);

  // Send an audio blob to whichever backend is active
  const transcribeChunk = useCallback(async (blob: Blob) => {
    if (blob.size < 1000) return;

    if (modeRef.current === 'sidecar') {
      const form = new FormData();
      form.append('audio', blob, 'chunk.webm');
      try {
        const r = await fetch(`${STT_URL}/transcribe`, { method: 'POST', body: form });
        if (!r.ok) return;
        const { text } = await r.json() as { text?: string };
        if (text) insertText(text);
      } catch { /* sidecar stopped */ }
      return;
    }

    if (modeRef.current === 'wasm' && wasmWorkerRef.current) {
      try {
        const audio = await blobToFloat32(blob);
        const text = await new Promise<string>((resolve) => {
          wasmPendingRef.current = resolve;
          wasmWorkerRef.current!.postMessage({ type: 'transcribe', audio }, [audio.buffer]);
        });
        if (text) insertText(text);
      } catch { /* transcription error */ }
    }
  }, [insertText]);

  const stopRecording = useCallback(() => {
    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, []);

  const startChunk = useCallback((stream: MediaStream) => {
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      void transcribeChunk(blob);
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
  }, [transcribeChunk]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      startChunk(stream);
      setIsRecording(true);

      chunkTimerRef.current = setInterval(() => {
        const old = mediaRecorderRef.current;
        if (old?.state !== 'recording') return;
        const origStop = old.onstop as (() => void) | null;
        old.onstop = () => {
          origStop?.();
          startChunk(stream);
        };
        old.stop();
      }, CHUNK_INTERVAL_MS);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Microphone access denied');
    }
  }, [startChunk]);

  const toggle = useCallback(() => {
    if (!isAvailable) return;
    if (isRecording) {
      stopRecording();
    } else {
      void startRecording();
    }
  }, [isAvailable, isRecording, startRecording, stopRecording]);

  // Keyboard shortcut
  useEffect(() => {
    if (!isAvailable) return;
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const parts = shortcut.split('+');
    const keyLetter = parts[parts.length - 1].toLowerCase();
    const needsMod = parts.includes('Mod');
    const needsShift = parts.includes('Shift');

    const handleKeyDown = (e: KeyboardEvent) => {
      const modHeld = needsMod ? (isMac ? e.metaKey : e.ctrlKey) : true;
      const shiftHeld = needsShift ? e.shiftKey : true;
      if (modHeld && shiftHeld && e.key.toLowerCase() === keyLetter) {
        e.preventDefault();
        toggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAvailable, shortcut, toggle]);

  // Cleanup on unmount
  useEffect(() => stopRecording, [stopRecording]);

  return { isRecording, isAvailable, unavailableReason, shortcut, error, toggle };
}
