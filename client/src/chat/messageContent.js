// What's INSIDE an encrypted message. The server can't see any of this — not even whether
// a message is text, a photo or a voice note (it only sees ciphertext of some length).
//
// Older messages are a plain string. Newer ones are a small JSON object:
//   { v: 1, kind: 'text',  text, replyTo? }
//   { v: 1, kind: 'image', text?, media, replyTo? }      media = { id, key, nonce, mime, size, width, height, thumb }
//   { v: 1, kind: 'video', text?, media, replyTo? }
//   { v: 1, kind: 'voice', media: { ...,  duration, waveform } }
//   replyTo = { id, senderId, preview }  (preview is a short snippet, also encrypted)

export function encodeContent(content) {
  return JSON.stringify({ v: 1, ...content });
}

export function decodeContent(text) {
  if (text == null) return null;
  if (text.startsWith('{"v":')) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && parsed.v === 1 && parsed.kind) return parsed;
    } catch {
      // Not valid JSON after all: treat as plain text below.
    }
  }
  return { v: 1, kind: 'text', text };
}

// One-line summary for chat list previews, reply quotes and notifications.
export function describeContent(content) {
  if (!content) return 'Encrypted message';
  switch (content.kind) {
    case 'image':
      return content.text ? `Photo · ${content.text}` : 'Photo';
    case 'video':
      return content.text ? `Video · ${content.text}` : 'Video';
    case 'voice':
      return 'Voice message';
    default:
      return content.text;
  }
}
