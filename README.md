# Private Chat

Invite-only, end-to-end encrypted chat web app for a small circle.

| Folder    | What it is                                        |
|-----------|---------------------------------------------------|
| `server/` | Node.js + Express + Socket.IO API (port 3000)     |
| `client/` | React + Vite + Tailwind CSS web app (port 5173)   |

## Run locally (two terminals)

```bash
cd server
npm install
cp .env.example .env      # then set DATABASE_URL and JWT_ACCESS_SECRET
npm run migrate up        # create the tables
npm run invite            # print a one-time invite code for the first user
npm run dev
```

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173. In development, Vite forwards `/api/...` and `/socket.io/...`
to the server on port 3000.

Useful server commands: `npm run test-email -- you@example.com` checks the SMTP settings.

## Security design

### End-to-end encryption (E2EE)

| Piece | How |
|---|---|
| Library | libsodium (WebAssembly). No home-made crypto. |
| Identity keys | One X25519 key pair per account, generated **in the browser**. The private key is stored in the browser's IndexedDB and never sent to the server. Only the public key is uploaded. |
| Chat key | `BLAKE2b(context ‖ X25519(myPrivate, theirPublic) ‖ sortedPublicKeys)`: both people compute the same 32-byte key; the server cannot. |
| Messages | XChaCha20-Poly1305 with a random 24-byte nonce per message. Associated data = `chatId|senderId`, so a ciphertext can't be moved to another chat or re-attributed to another sender. Stored as `e2ee:v1:<nonce>:<ciphertext>`. |
| Server rule | The server **rejects** any message that isn't in the encrypted format, so it only ever stores ciphertext. |
| Verification | A 60-digit **safety number** (hash of both public keys) + QR code. People compare them in person/on a call and mark the contact verified. If a contact's key later changes, the chat shows a warning. |
| Key backup | Optional. The private key is encrypted in the browser with a **backup passphrase** (Argon2id, 64 MB, 3 passes → XChaCha20-Poly1305) and the locked box is stored on the server. The server can't open it; a new device unlocks it with the passphrase. |

### Accounts and sessions

- Invite-only signup (one-time codes, stored hashed). Passwords hashed with argon2id.
- 15-minute JWT access tokens in memory; 30-day refresh tokens in an httpOnly cookie, stored hashed,
  rotated on every use, with reuse detection (a reused token logs out all sessions).
- Socket.IO connections authenticate with the JWT; the token is re-checked on every event.
- Rate limiting, zod input validation, helmet, strict CORS, secrets only in `.env`.
- Password reset via a one-time, 30-minute, hashed email link; resetting logs out every device.

## Threat model

**What E2EE protects against**

- A curious or compromised **database or server operator** reading messages: they only see ciphertext.
- Someone who steals a **database backup**: messages, invite codes, sessions and reset tokens are all
  encrypted or hashed.
- A server that **swaps keys** to read messages (man-in-the-middle): detectable by comparing safety numbers.
- Tampering with messages in transit or in storage: the Poly1305 tag fails and the message isn't shown.

**What it does NOT protect against — read this**

1. **The web E2EE limitation (most important).** In a web app, the server delivers the JavaScript that
   does the encryption *every time you open the page*. A malicious or hacked server could send modified
   JavaScript that quietly leaks your private key or messages, and you wouldn't notice. Native apps
   reduce this risk because their code is signed and reviewed by app stores. Mitigations here: HTTPS,
   a strict Content Security Policy (Phase 9), open-source code people can audit, and (later) installing
   the app as a PWA. **For this project the server is trusted not to serve malicious code.**
2. **Metadata is visible to the server:** who talks to whom, when, how often, message sizes, IP addresses,
   read/delivered times, and typing indicators. Only message *content* is hidden.
3. **No forward secrecy:** chat keys come from long-term identity keys (no Signal-style "double ratchet").
   If someone steals your private key, they can decrypt your past messages that they recorded.
4. **A compromised device** (malware, browser extensions, someone with your unlocked laptop) can read
   everything, including the private key in IndexedDB. Cross-site scripting (XSS) in the app would too —
   React's escaping, no `dangerouslySetInnerHTML`, and (Phase 9) CSP help prevent that.
5. **Weak backup passphrases** can be guessed offline by someone who steals the backup. Argon2id makes each
   guess slow, but a long passphrase is essential.
6. **Losing your key** (cleared browser data, no backup, forgotten passphrase) means old messages are gone
   for good. "Start fresh" creates a new key; older messages show "can't decrypt".
7. **Messages sent before E2EE was added** are stored in plain text and shown with an 🔓 icon.
