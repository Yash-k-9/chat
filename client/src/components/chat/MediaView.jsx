// Showing encrypted photos and videos inside chat bubbles, plus a full-screen viewer.
import { useEffect, useState } from 'react';
import useMediaUrl from '../../hooks/useMediaUrl.js';
import { formatDuration } from '../../chat/mediaPrep.js';
import Spinner from '../Spinner.jsx';
import { AlertIcon, CloseIcon, DownloadIcon, PlayIcon } from '../Icons.jsx';

const MAX_W = 300;
const MAX_H = 360;

// Fit the media into the bubble while keeping its shape.
function fitSize(width = 4, height = 3) {
  const scale = Math.min(MAX_W / width, MAX_H / height, 1);
  return { width: Math.max(140, Math.round(width * scale)), height: Math.max(100, Math.round(height * scale)) };
}

function ProgressRing({ progress }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90" aria-label={`Uploading ${Math.round(progress * 100)}%`}>
      <circle cx="22" cy="22" r={radius} fill="rgb(0 0 0 / 0.45)" stroke="rgb(255 255 255 / 0.3)" strokeWidth="3" />
      <circle
        cx="22"
        cy="22"
        r={radius}
        fill="none"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress)}
        className="transition-[stroke-dashoffset] duration-200"
      />
    </svg>
  );
}

function Overlay({ children }) {
  return <div className="absolute inset-0 flex items-center justify-center">{children}</div>;
}

export function Lightbox({ media, onClose }) {
  const { url } = useMediaUrl(media);

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const extension = media.mime?.split('/')[1]?.replace('jpeg', 'jpg') || 'bin';

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label="Media viewer"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="flex justify-end gap-2 p-3">
        {url && (
          <a
            href={url}
            download={`private-chat-${media.id.slice(0, 8)}.${extension}`}
            className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Download"
            title="Download"
          >
            <DownloadIcon />
          </a>
        )}
        <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white">
          <CloseIcon />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        {!url ? (
          <Spinner className="h-8 w-8" tone="white" />
        ) : media.mime?.startsWith('video/') ? (
          <video src={url} controls autoPlay playsInline className="max-h-full max-w-full rounded-lg" />
        ) : (
          <img src={url} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        )}
      </div>
    </div>
  );
}

export function ImageMessage({ media, upload, onOpen }) {
  const { url, error } = useMediaUrl(media);
  const [loaded, setLoaded] = useState(false);
  const size = fitSize(media.width, media.height);

  return (
    <button
      type="button"
      onClick={() => url && onOpen()}
      className="relative block overflow-hidden rounded-xl bg-subtle"
      style={size}
      aria-label="Open photo"
    >
      {/* Blurred tiny preview while the real photo downloads and decrypts */}
      {media.thumb && !loaded && (
        <img src={media.thumb} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover blur-lg" />
      )}
      {url && (
        <img
          src={url}
          alt="Photo"
          onLoad={() => setLoaded(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      {upload ? (
        <Overlay>
          <ProgressRing progress={upload.progress ?? 0} />
        </Overlay>
      ) : error ? (
        <Overlay>
          <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white">
            <AlertIcon className="h-3.5 w-3.5" /> {error}
          </span>
        </Overlay>
      ) : (
        !url && (
          <Overlay>
            <Spinner className="h-6 w-6" tone="white" />
          </Overlay>
        )
      )}
    </button>
  );
}

// Videos are only downloaded + decrypted when the user taps play (they can be big).
export function VideoMessage({ media, upload, onOpen }) {
  const size = fitSize(media.width, media.height);
  return (
    <button
      type="button"
      onClick={() => !upload && onOpen()}
      className="relative block overflow-hidden rounded-xl bg-slate-900"
      style={size}
      aria-label="Play video"
    >
      {(media.poster || media.thumb) && (
        <img
          src={media.poster || media.thumb}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover ${media.poster ? '' : 'scale-110 blur-lg'}`}
        />
      )}
      <Overlay>
        {upload ? (
          <ProgressRing progress={upload.progress ?? 0} />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
            <PlayIcon className="ml-0.5 h-5 w-5" />
          </span>
        )}
      </Overlay>
      {media.duration > 0 && (
        <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white">
          {formatDuration(media.duration)}
        </span>
      )}
    </button>
  );
}
