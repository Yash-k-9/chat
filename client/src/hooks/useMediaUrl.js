// Turn an encrypted media reference into something an <img>/<video>/<audio> can show:
// download the encrypted bytes, decrypt them in the browser, wrap them in a Blob URL.
//   const { url, loading, error } = useMediaUrl(media, { enabled })
import { useEffect, useState } from 'react';
import { downloadMedia } from '../api/client.js';
import { decryptFile } from '../crypto/mediaCrypto.js';

// Decrypted files are kept in memory while the page is open, so scrolling back and forth
// doesn't download and decrypt them again. Small cap so memory stays reasonable.
const cache = new Map(); // media id → blob URL
const inFlight = new Map(); // media id → Promise<blob URL>
const MAX_CACHED = 60;

function remember(id, url) {
  cache.set(id, url);
  if (cache.size > MAX_CACHED) {
    const [oldestId, oldestUrl] = cache.entries().next().value;
    cache.delete(oldestId);
    URL.revokeObjectURL(oldestUrl);
  }
}

// Optimistic sends: show the local file immediately, before the upload finishes.
export function primeMediaCache(id, blob) {
  remember(id, URL.createObjectURL(blob));
}

export async function loadMediaUrl(media) {
  if (cache.has(media.id)) return cache.get(media.id);
  if (!inFlight.has(media.id)) {
    const job = downloadMedia(media.id)
      .then((ciphertext) => {
        const bytes = decryptFile(ciphertext, media.key, media.nonce);
        const url = URL.createObjectURL(new Blob([bytes], { type: media.mime }));
        remember(media.id, url);
        return url;
      })
      .finally(() => inFlight.delete(media.id));
    inFlight.set(media.id, job);
  }
  return inFlight.get(media.id);
}

export default function useMediaUrl(media, { enabled = true } = {}) {
  const [state, setState] = useState(() => ({
    url: media && cache.get(media.id),
    loading: false,
    error: '',
  }));

  useEffect(() => {
    if (!media?.id || !enabled) return;
    if (cache.has(media.id)) {
      setState({ url: cache.get(media.id), loading: false, error: '' });
      return;
    }
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: '' }));
    loadMediaUrl(media)
      .then((url) => !cancelled && setState({ url, loading: false, error: '' }))
      .catch((err) => !cancelled && setState({ url: null, loading: false, error: err.message || 'Could not load' }));
    return () => {
      cancelled = true;
    };
  }, [media?.id, media?.key, media?.nonce, media?.mime, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
