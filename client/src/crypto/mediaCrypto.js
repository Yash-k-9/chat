// Encrypting FILES (photos, videos, voice notes).
// Each file gets its OWN random 32-byte key and nonce. The file is encrypted with
// XChaCha20-Poly1305 and uploaded; the key + nonce are put inside the chat message, which is
// itself end-to-end encrypted. So only the people in the chat can ever decrypt the file.
import { sodium } from './sodium.js';

const FILE_AD = 'private-chat/media/v1';

export function encryptFile(bytes) {
  const key = sodium.crypto_aead_xchacha20poly1305_ietf_keygen();
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(bytes, FILE_AD, null, nonce, key);
  return { ciphertext, key: sodium.to_base64(key), nonce: sodium.to_base64(nonce) };
}

// Throws if the file was tampered with or the key is wrong.
export function decryptFile(ciphertext, key, nonce) {
  return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    ciphertext,
    FILE_AD,
    sodium.from_base64(nonce),
    sodium.from_base64(key),
  );
}
