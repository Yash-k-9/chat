// libsodium: a well-reviewed crypto library (compiled to WebAssembly). We never write our
// own crypto algorithms; we only combine libsodium's building blocks in standard ways.
// The "sumo" build is needed for crypto_pwhash (Argon2id), used by the key backup.

// After initSodium() resolves, `sodium` holds the ready library (ES modules export a
// live binding, so importers see the value once it's set).
export let sodium = null;

let readyPromise = null;

export function initSodium() {
  // Dynamic import: the ~800 KB library becomes its own file, downloaded only after
  // login, so the login page itself stays fast.
  readyPromise ||= import('libsodium-wrappers-sumo').then(async ({ default: lib }) => {
    await lib.ready;
    sodium = lib;
    return sodium;
  });
  return readyPromise;
}
