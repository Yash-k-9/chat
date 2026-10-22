// Getting photos and videos ready to send, entirely in the browser.
//
// PHOTOS are redrawn onto a <canvas> and saved again as a new JPEG/PNG. That does two jobs:
//   1. shrinks big phone photos (max 2048 px) so they upload fast, and
//   2. STRIPS ALL METADATA (EXIF: GPS location, camera model, date…), because the new file
//      is built only from pixels.
// We also make a tiny blurry preview (thumb) that is shown while the full photo loads.

export const MAX_FILE_MB = 25;
const MAX_DIMENSION = 2048;
const THUMB_SIZE = 24;

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not process image'))), type, quality),
  );
}

// A ~24 px JPEG as a data URL: a few hundred bytes, travels inside the encrypted message.
function makeThumb(source, width, height) {
  const scale = THUMB_SIZE / Math.max(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.6);
}

export async function prepareImage(file) {
  // imageOrientation: 'from-image' applies the EXIF rotation BEFORE we throw EXIF away,
  // so portrait phone photos don't end up sideways.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  // PNGs may be transparent: keep PNG for them; everything else becomes JPEG.
  const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  if (mime === 'image/jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
  }
  context.drawImage(bitmap, 0, 0, width, height);

  const blob = await canvasToBlob(canvas, mime, 0.85);
  const thumb = makeThumb(bitmap, bitmap.width, bitmap.height);
  bitmap.close();
  return { blob, mime, width, height, thumb };
}

// VIDEOS are sent as-is (re-encoding video in a browser is slow and heavy), so we only read
// their size/duration and grab one frame as a preview. Note: video metadata is NOT stripped.
export function prepareVideo(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    const fail = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This video format can't be played in the browser"));
    };
    video.onerror = fail;
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(0.5, (video.duration || 1) / 2); // jump to a frame to draw
    };
    video.onseeked = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (!width || !height) return fail();
      const thumb = makeThumb(video, width, height);
      // A poster frame shown before playing. Kept small (max 240 px) because it travels
      // inside the encrypted message itself.
      const scale = Math.min(1, 240 / Math.max(width, height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      const poster = canvas.toDataURL('image/jpeg', 0.6);
      URL.revokeObjectURL(url);
      resolve({
        blob: file,
        mime: file.type || 'video/mp4',
        width,
        height,
        duration: Math.round(video.duration || 0),
        thumb,
        poster,
      });
    };
  });
}

export function isTooLarge(file) {
  return file.size > MAX_FILE_MB * 1024 * 1024;
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDuration(seconds = 0) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
