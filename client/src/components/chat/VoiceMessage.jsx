// Voice note player: play/pause, a waveform that fills as it plays, and the duration.
// The audio is downloaded + decrypted only when the user presses play.
import { useEffect, useRef, useState } from 'react';
import useMediaUrl from '../../hooks/useMediaUrl.js';
import { formatDuration } from '../../chat/mediaPrep.js';
import Spinner from '../Spinner.jsx';
import { PauseIcon, PlayIcon } from '../Icons.jsx';

export default function VoiceMessage({ media, upload, mine }) {
  const [wantPlay, setWantPlay] = useState(false);
  const { url, loading, error } = useMediaUrl(media, { enabled: wantPlay || Boolean(upload) });
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1

  // Start playback as soon as the decrypted audio is ready.
  useEffect(() => {
    if (wantPlay && url && audioRef.current) audioRef.current.play().catch(() => {});
  }, [wantPlay, url]);

  function toggle() {
    if (upload) return;
    if (!url) return setWantPlay(true);
    const audio = audioRef.current;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }

  const bars = media.waveform?.length ? media.waveform : Array.from({ length: 32 }, () => 0.3);
  const played = Math.round(progress * bars.length);
  const duration = media.duration || 0;

  return (
    <div className="flex w-60 items-center gap-3 py-1">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause voice message' : 'Play voice message'}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          mine ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-accent text-white hover:bg-accent-hover'
        }`}
      >
        {loading || upload ? (
          <Spinner className="h-4 w-4" tone="white" />
        ) : playing ? (
          <PauseIcon className="h-4 w-4" />
        ) : (
          <PlayIcon className="ml-0.5 h-4 w-4" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        {/* Waveform: one bar per slice of the recording, taller = louder */}
        <div className="flex h-7 items-center gap-[2px]" aria-hidden="true">
          {bars.map((level, index) => (
            <span
              key={index}
              className={`w-[3px] rounded-full ${
                index < played ? (mine ? 'bg-white' : 'bg-accent') : mine ? 'bg-white/40' : 'bg-faint/60'
              }`}
              style={{ height: `${Math.max(12, Math.round(level * 100))}%` }}
            />
          ))}
        </div>
        <p className={`mt-0.5 text-[11px] ${mine ? 'text-white/75' : 'text-faint'}`}>
          {error ? 'Could not load' : formatDuration(playing || progress > 0 ? progress * duration : duration)}
        </p>
      </div>

      {url && (
        <audio
          ref={audioRef}
          src={url}
          preload="auto"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setProgress(0);
          }}
          onTimeUpdate={(event) => {
            const audio = event.currentTarget;
            const total = Number.isFinite(audio.duration) ? audio.duration : duration;
            setProgress(total ? audio.currentTime / total : 0);
          }}
        />
      )}
    </div>
  );
}
