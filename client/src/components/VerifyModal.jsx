// Safety number check: proves you're talking to the real person, not to someone who
// swapped keys in the middle (a "man-in-the-middle", e.g. a hacked server).
// Both people see the SAME 60 digits only if they have each other's real keys.
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import Alert from './Alert.jsx';
import { safetyNumber } from '../crypto/e2ee.js';

const QR_PREFIX = 'private-chat-safety:v1:';

// Camera scanning uses the browser's built-in BarcodeDetector (Chrome on Android/Mac, Edge...).
// Where it doesn't exist, people compare the numbers by eye instead.
const canScan = typeof window !== 'undefined' && 'BarcodeDetector' in window;

function QrScanner({ expected, onResult, onCancel }) {
  const videoRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let stream;
    let stopped = false;
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        // Look for a QR code a few times per second.
        while (!stopped) {
          const codes = await detector.detect(videoRef.current).catch(() => []);
          const value = codes.find((code) => code.rawValue.startsWith(QR_PREFIX))?.rawValue;
          if (value) {
            onResult(value === expected);
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      } catch {
        setError('Could not open the camera. Allow camera access, or compare the numbers instead.');
      }
    }
    start();

    return () => {
      stopped = true;
      stream?.getTracks().forEach((track) => track.stop()); // turn the camera off
    };
  }, [expected, onResult]);

  return (
    <div className="space-y-3">
      {error ? (
        <Alert>{error}</Alert>
      ) : (
        <video ref={videoRef} muted playsInline className="aspect-square w-full rounded-3xl bg-black object-cover" />
      )}
      <Button variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

export default function VerifyModal({ myPublicKey, peer, verified, onVerify, onUnverify, onClose }) {
  const groups = safetyNumber(myPublicKey, peer.publicKey);
  const payload = QR_PREFIX + groups.join('');
  const [qr, setQr] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null); // null | 'match' | 'mismatch'

  useEffect(() => {
    QRCode.toDataURL(payload, { margin: 1, width: 240, color: { dark: '#2e1065', light: '#ffffff' } }).then(setQr);
  }, [payload]);

  function handleScan(matches) {
    setScanning(false);
    setScanResult(matches ? 'match' : 'mismatch');
    if (matches) onVerify();
  }

  return (
    <Modal title={`Verify ${peer.displayName}`} emoji="🛡️" onClose={onClose}>
      {scanning ? (
        <QrScanner expected={payload} onResult={handleScan} onCancel={() => setScanning(false)} />
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-zinc-400">
            Messages are end-to-end encrypted. To be sure nobody is secretly in the middle, compare these numbers with{' '}
            {peer.displayName} in person or on a call. <strong className="text-zinc-200">They should be identical.</strong>
          </p>

          {scanResult === 'match' && <Alert tone="success">Codes match! {peer.displayName} is verified.</Alert>}
          {scanResult === 'mismatch' && (
            <Alert>The codes DON&apos;T match. Don&apos;t share anything sensitive, and check again together.</Alert>
          )}

          <div className="grid grid-cols-4 gap-2 rounded-3xl bg-raised p-4 text-center font-mono text-lg tracking-wider">
            {groups.map((group, index) => (
              <span key={index}>{group}</span>
            ))}
          </div>

          {qr && (
            <div className="flex flex-col items-center gap-2">
              <img src={qr} alt="Safety number QR code" className="h-44 w-44 rounded-2xl bg-white p-2 shadow-md" />
              <p className="text-xs text-zinc-500">Or scan each other&apos;s code</p>
            </div>
          )}

          <div className="space-y-2">
            {canScan && (
              <Button variant="secondary" onClick={() => setScanning(true)}>
                📷 Scan their code
              </Button>
            )}
            {verified ? (
              <Button variant="secondary" onClick={onUnverify}>
                Remove verification
              </Button>
            ) : (
              <Button onClick={onVerify}>✅ The numbers match — mark verified</Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
