// End-to-end encryption for 1-to-1 chats. Pure functions: keys in, bytes out.
// Call initSodium() once before using anything here.
//
// HOW IT WORKS
// 1. Each person has an X25519 key pair. Private key stays in their browser.
// 2. Diffie-Hellman: MY private key + THEIR public key gives the SAME secret as
//    THEIR private key + MY public key. Nobody watching the network can compute it.
// 3. We hash that secret (together with both public keys) into a 32-byte chat key.
// 4. Each message is encrypted with XChaCha20-Poly1305 using the chat key and a fresh
//    random nonce. Poly1305 is a tamper seal: a modified message fails to decrypt.
import { sodium } from './sodium.js';

const MESSAGE_PREFIX = 'e2ee:v1:';
const CHAT_KEY_CONTEXT = 'private-chat/chat-key/v1';

const b64 = (bytes) => sodium.to_base64(bytes); // URL-safe base64, no padding
const unb64 = (text) => sodium.from_base64(text);

export function generateIdentityKeyPair() {
  const { publicKey, privateKey } = sodium.crypto_box_keypair(); // X25519
  return { publicKey: b64(publicKey), privateKey };
}

// The public key that belongs to a private key (used to check restored backups).
export function publicKeyFromPrivate(privateKey) {
  return b64(sodium.crypto_scalarmult_base(privateKey));
}

// Both sides compute the same chat key. Sorting the public keys makes the order the same
// for both people. Hashing in the public keys ties the key to exactly these two identities.
export function deriveChatKey(myPrivateKey, myPublicKey, theirPublicKey) {
  const shared = sodium.crypto_scalarmult(myPrivateKey, unb64(theirPublicKey)); // throws on a malicious "zero" key
  const [first, second] = [myPublicKey, theirPublicKey].sort();
  const input = new Uint8Array([
    ...sodium.from_string(CHAT_KEY_CONTEXT),
    ...shared,
    ...unb64(first),
    ...unb64(second),
  ]);
  const chatKey = sodium.crypto_generichash(32, input); // BLAKE2b
  sodium.memzero(shared); // wipe the raw secret from memory
  return chatKey;
}

// "Additional authenticated data": not secret, but sealed together with the message.
// The server can't move a ciphertext to another chat or pretend someone else sent it.
const associatedData = ({ chatId, senderId }) => `${chatId}|${senderId}`;

export function isEncryptedBody(body) {
  return typeof body === 'string' && body.startsWith(MESSAGE_PREFIX);
}

export function encryptMessage(chatKey, plaintext, context) {
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES); // 24 random bytes
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    plaintext,
    associatedData(context),
    null,
    nonce,
    chatKey,
  );
  return `${MESSAGE_PREFIX}${b64(nonce)}:${b64(ciphertext)}`;
}

// Throws if the message was tampered with, belongs to another chat/sender, or used another key.
export function decryptMessage(chatKey, body, context) {
  const [nonce, ciphertext] = body.slice(MESSAGE_PREFIX.length).split(':');
  const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    unb64(ciphertext),
    associatedData(context),
    unb64(nonce),
    chatKey,
  );
  return sodium.to_string(plaintext);
}

// SAFETY NUMBER: 60 digits that both people see identically. If they match when compared
// in person (or on a call), nobody swapped a key in the middle ("man-in-the-middle").
export function safetyNumber(publicKeyA, publicKeyB) {
  const [first, second] = [publicKeyA, publicKeyB].sort();
  const hash = sodium.crypto_generichash(
    64,
    new Uint8Array([...sodium.from_string('private-chat/safety-number/v1'), ...unb64(first), ...unb64(second)]),
  );
  const groups = [];
  for (let i = 0; i < 12; i++) {
    // 5 bytes → a 40-bit number → 5 digits
    let value = 0;
    for (let j = 0; j < 5; j++) value = value * 256 + hash[i * 5 + j];
    groups.push(String(value % 100000).padStart(5, '0'));
  }
  return groups; // 12 groups of 5 digits
}
