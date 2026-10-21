// Encrypted key backup. The private key is locked with a BACKUP PASSPHRASE that only the
// user knows (separate from the login password), then uploaded. The server stores a box it
// cannot open; on a new device the user types the passphrase to unlock it.
//
// Argon2id turns the passphrase into a key. It is deliberately slow and memory-hungry,
// so guessing passphrases offline is very expensive for an attacker.
import { sodium } from './sodium.js';
import { publicKeyFromPrivate } from './e2ee.js';

// ~1–3 s in a browser. 64 MB of memory is safe on phones; values are saved WITH the backup,
// so they can be raised later without breaking old backups.
const OPSLIMIT = 3;
const MEMLIMIT = 64 * 1024 * 1024;

export const MIN_PASSPHRASE_LENGTH = 12;

function passphraseKey(passphrase, salt, opslimit, memlimit) {
  return sodium.crypto_pwhash(32, passphrase, salt, opslimit, memlimit, sodium.crypto_pwhash_ALG_ARGON2ID13);
}

export function createBackup(privateKey, publicKey, passphrase) {
  const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES); // 16 bytes
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const key = passphraseKey(passphrase, salt, OPSLIMIT, MEMLIMIT);
  // The public key is sealed in as associated data: the box only opens for this key pair.
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(privateKey, publicKey, null, nonce, key);
  sodium.memzero(key);
  return {
    publicKey,
    ciphertext: sodium.to_base64(ciphertext),
    nonce: sodium.to_base64(nonce),
    salt: sodium.to_base64(salt),
    opslimit: OPSLIMIT,
    memlimit: MEMLIMIT,
  };
}

// Returns the private key, or throws "Wrong passphrase".
export function restoreBackup(backup, passphrase) {
  const key = passphraseKey(passphrase, sodium.from_base64(backup.salt), backup.opslimit, backup.memlimit);
  let privateKey;
  try {
    privateKey = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      sodium.from_base64(backup.ciphertext),
      backup.publicKey,
      sodium.from_base64(backup.nonce),
      key,
    );
  } catch {
    throw new Error('Wrong passphrase');
  } finally {
    sodium.memzero(key);
  }
  // Belt and braces: the unlocked private key must really match the public key.
  if (publicKeyFromPrivate(privateKey) !== backup.publicKey) throw new Error('Backup does not match its key');
  return privateKey;
}
