// Record a voice note with the browser's MediaRecorder, while sampling the volume to
// draw a waveform. Max 2 minutes.
//   const rec = useVoiceRecorder();
//   await rec.start();  …  const { blob, duration, waveform } = await rec.stop();  // or rec.cancel()
import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_SECONDS = 120;
const WAVEFORM_BARS = 36;

// Pick a format this browser can record (Chrome/Firefox: WebM/Opus, Safari: MP4/AAC).
function pickMimeType() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return candidates.find((type) => window.MediaRecorder?.isTypeSupported?.(type)) || '';
}

// Squash many volume samples into a fixed number of bars between 0 and 1.
function toWaveform(levels) {
  if (!levels.length) return Array(WAVEFORM_BARS).fill(0.2);
  const bars = [];
  const chunk = levels.length / WAVEFORM_BARS;
  for (let i = 0; i < WAVEFORM_BARS; i++) {
    const slice = levels.slice(Math.floor(i * chunk), Math.max(Math.floor((i + 1) * chunk), Math.floor(i * chunk) + 1));
    bars.push(slice.reduce((sum, v) => sum + v, 0) / slice.length);
  }
  const max = Math.max(...bars, 0.01);
  return bars.map((v) => Math.round((v / max) * 100) / 100);
}

export default function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0); // live volume 0..1 for a pulsing dot
  const parts = useRef(null);

  const cleanup = useCallback(() => {
    const p = parts.current;
    if (!p) return;
    clearInterval(p.timer);
    p.stream.getTracks().forEach((track) => track.stop()); // release the microphone
    p.audioContext.close().catch(() => {});
    parts.current = null;
    setRecording(false);
    setSeconds(0);
    setLevel(0);
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const stop = useCallback(() => {
    const p = parts.current;
    if (!p) return Promise.resolve(null);
    return new Promise((resolve) => {
      p.recorder.onstop = () => {
        const duration = Math.max(1, Math.round((Date.now() - p.startedAt) / 1000));
        const blob = new Blob(p.chunks, { type: p.recorder.mimeType || 'audio/webm' });
        const waveform = toWaveform(p.levels);
        cleanup();
        resolve({ blob, duration, waveform });
      };
      p.recorder.stop();
    });
  }, [cleanup]);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      throw new Error('Voice recording is not supported in this browser.');
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); // asks for permission
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks = [];
    recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data);

    // Analyser: measures loudness ~10 times a second for the waveform.
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    audioContext.createMediaStreamSource(stream).connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    const levels = [];
    const startedAt = Date.now();

    const timer = setInterval(() => {
      analyser.getByteTimeDomainData(samples);
      let peak = 0;
      for (const sample of samples) peak = Math.max(peak, Math.abs(sample - 128) / 128);
      levels.push(peak);
      setLevel(peak);
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setSeconds(elapsed);
      if (elapsed >= MAX_SECONDS) recorder.state === 'recording' && recorder.stop();
    }, 100);

    parts.current = { stream, recorder, chunks, audioContext, levels, startedAt, timer };
    recorder.start(250);
    setRecording(true);
  }, []);

  const cancel = useCallback(() => {
    const p = parts.current;
    if (!p) return;
    p.recorder.onstop = null;
    if (p.recorder.state !== 'inactive') p.recorder.stop();
    cleanup();
  }, [cleanup]);

  return { recording, seconds, level, maxSeconds: MAX_SECONDS, start, stop, cancel };
}
