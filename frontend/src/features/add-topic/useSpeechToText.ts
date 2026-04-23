import { useState, useEffect, useRef, useCallback } from 'react';

const STT_URL = 'http://localhost:3457';
const CHUNK_INTERVAL_MS = 5000;

export type UnavailableReason = 'disabled' | 'model_missing' | 'sidecar_offline' | null;

export interface SpeechToTextState {
  isRecording: boolean;
  isAvailable: boolean;
  unavailableReason: UnavailableReason;
  shortcut: string;
  error: string | null;
  toggle: () => void;
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

  // Check sidecar availability on mount, with retries while sidecar warms up
  useEffect(() => {
    let cancelled = false;
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1000;

    const checkHealth = async (attempt: number) => {
      try {
        const r = await fetch(`${STT_URL}/health`);
        const data = await r.json();
        if (cancelled) return;
        setShortcut(data.shortcut ?? 'Mod+Shift+M');
        if (data.enabled && data.modelLoaded) {
          setIsAvailable(true);
          setUnavailableReason(null);
        } else {
          setIsAvailable(false);
          setUnavailableReason(data.unavailableReason ?? 'disabled');
        }
      } catch {
        if (cancelled) return;
        if (attempt < MAX_RETRIES) {
          setTimeout(() => { if (!cancelled) checkHealth(attempt + 1); }, RETRY_DELAY_MS);
        } else {
          setIsAvailable(false);
          setUnavailableReason('sidecar_offline');
        }
      }
    };

    checkHealth(0);
    return () => { cancelled = true; };
  }, []);

  // Insert text at saved cursor position into the element active when recording started
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

    // Trigger React synthetic onChange via native setter
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

  // Send an audio blob to the sidecar and insert the result
  const transcribeChunk = useCallback(async (blob: Blob) => {
    if (blob.size < 1000) return;
    const form = new FormData();
    form.append('audio', blob, 'chunk.webm');
    try {
      const r = await fetch(`${STT_URL}/transcribe`, { method: 'POST', body: form });
      if (!r.ok) return;
      const { text } = await r.json();
      if (text) insertText(text);
    } catch {
      // Network error — sidecar may have stopped
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
      transcribeChunk(blob);
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
  }, [transcribeChunk]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Capture whichever input/textarea currently has focus
      const active = document.activeElement;
      if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) {
        activeElRef.current = active;
        cursorPositionRef.current = active.selectionStart ?? active.value.length;
      } else {
        activeElRef.current = null;
        cursorPositionRef.current = null;
      }

      startChunk(stream);
      setIsRecording(true);

      chunkTimerRef.current = setInterval(() => {
        const old = mediaRecorderRef.current;
        if (old?.state !== 'recording') return;
        // Chain: start next chunk only after old recorder's onstop fires,
        // ensuring all buffered data is flushed before the new recorder starts.
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
  }, [startChunk, textareaRef]);

  const toggle = useCallback(() => {
    if (!isAvailable) return;
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isAvailable, isRecording, startRecording, stopRecording]);

  // Keyboard shortcut listener — key combo derived from shortcut state (e.g. "Mod+Shift+M")
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
