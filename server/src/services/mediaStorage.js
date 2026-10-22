// Where encrypted media bytes live. Two interchangeable "adapters":
//   • local disk (default, great for development)
//   • Cloudinary (set CLOUDINARY_URL), uploaded as "raw" files because they're encrypted
//     blobs — Cloudinary can't (and shouldn't) see that they're photos.
// Either way the server only ever handles CIPHERTEXT; the key is inside the E2EE message.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import env from '../config/env.js';

// ---------- Local disk ----------
const localDir = path.resolve(env.mediaDir);

const local = {
  async put(id, bytes) {
    await fs.mkdir(localDir, { recursive: true });
    await fs.writeFile(path.join(localDir, `${id}.bin`), bytes);
    return `${id}.bin`;
  },
  async get(storageKey) {
    return fs.readFile(path.join(localDir, path.basename(storageKey))); // basename: no path tricks
  },
  async remove(storageKey) {
    await fs.rm(path.join(localDir, path.basename(storageKey)), { force: true });
  },
};

// ---------- Cloudinary (REST API, no SDK) ----------
function cloudinaryConfig() {
  const url = new URL(env.cloudinaryUrl); // cloudinary://key:secret@cloud
  return { apiKey: decodeURIComponent(url.username), apiSecret: decodeURIComponent(url.password), cloud: url.hostname };
}

// Cloudinary signs requests with SHA-1 over the sorted parameters + the API secret.
function sign(params, apiSecret) {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');
}

const cloudinary = {
  async put(id, bytes) {
    const { apiKey, apiSecret, cloud } = cloudinaryConfig();
    const params = { public_id: `private-chat/${id}`, timestamp: Math.floor(Date.now() / 1000), type: 'authenticated' };
    const form = new FormData();
    form.append('file', new Blob([bytes]), `${id}.bin`);
    for (const [key, value] of Object.entries(params)) form.append(key, String(value));
    form.append('api_key', apiKey);
    form.append('signature', sign(params, apiSecret));
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/raw/upload`, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`Cloudinary upload failed (${res.status})`);
    return params.public_id;
  },
  async get(storageKey) {
    // "authenticated" files need a signed URL; the server fetches and streams them on.
    const { apiKey, apiSecret, cloud } = cloudinaryConfig();
    const params = {
      public_id: storageKey,
      type: 'authenticated',
      expires_at: Math.floor(Date.now() / 1000) + 60,
      timestamp: Math.floor(Date.now() / 1000),
    };
    const query = new URLSearchParams({ ...params, api_key: apiKey, signature: sign(params, apiSecret) });
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/raw/download?${query}`);
    if (!res.ok) throw new Error(`Cloudinary download failed (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  },
  async remove(storageKey) {
    const { apiKey, apiSecret, cloud } = cloudinaryConfig();
    const params = { public_id: storageKey, timestamp: Math.floor(Date.now() / 1000), type: 'authenticated' };
    const form = new URLSearchParams({ ...params, api_key: apiKey, signature: sign(params, apiSecret) });
    await fetch(`https://api.cloudinary.com/v1_1/${cloud}/raw/destroy`, { method: 'POST', body: form });
  },
};

export const storage = env.cloudinaryUrl ? cloudinary : local;
export const storageName = env.cloudinaryUrl ? 'Cloudinary' : `local folder (${localDir})`;
