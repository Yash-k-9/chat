-- Up Migration

-- END-TO-END ENCRYPTION KEYS
-- public_key: the user's X25519 PUBLIC key (base64). Safe to share: others use it to
--             encrypt messages for this user. The PRIVATE key never leaves the browser.
-- key_backup: the private key ENCRYPTED in the browser with a passphrase only the user
--             knows (Argon2id + XChaCha20-Poly1305). The server can't decrypt it.
--             Shape: { ciphertext, nonce, salt, opslimit, memlimit, publicKey, createdAt }
ALTER TABLE users
  ADD COLUMN public_key TEXT,
  ADD COLUMN public_key_updated_at TIMESTAMPTZ,
  ADD COLUMN key_backup JSONB;

-- Down Migration

ALTER TABLE users
  DROP COLUMN IF EXISTS key_backup,
  DROP COLUMN IF EXISTS public_key_updated_at,
  DROP COLUMN IF EXISTS public_key;
