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
    QRCode.toDataURL(payload, { margin: 1, width: 240, color: { dark: '#0f172a', light: '#ffffff' } }).then(setQr);
  }, [payload]);

  function handleScan(matches) {
    setScanning(false);
    setScanResult(matches ? 'match' : 'mismatch');
    if (matches) onVerify();
  }

  return (
    <Modal
      title={`Verify ${peer.displayName}`}
      description="Confirm nobody is intercepting your encrypted messages."
      onClose={onClose}
    >
      {scanning ? (
        <QrScanner expected={payload} onResult={handleScan} onCancel={() => setScanning(false)} />
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-muted">
            Compare these numbers with {peer.displayName} in person or on a call. If they&apos;re{' '}
            <strong className="text-fg">identical</strong> on both screens, your conversation is secure.
          </p>

          {verified && !scanResult && <Alert tone="success">You verified {peer.displayName}.</Alert>}
          {scanResult === 'match' && <Alert tone="success">Codes match. {peer.displayName} is verified.</Alert>}
          {scanResult === 'mismatch' && (
            <Alert>The codes don&apos;t match. Don&apos;t share anything sensitive, and check again together.</Alert>
          )}

          <div className="grid grid-cols-4 gap-x-3 gap-y-2 rounded-xl border border-line bg-subtle p-4 text-center font-mono text-base tracking-wider">
            {groups.map((group, index) => (
              <span key={index}>{group}</span>
            ))}
          </div>

          {qr && (
            <div className="flex flex-col items-center gap-2">
              <img src={qr} alt="Safety number QR code" className="h-40 w-40 rounded-lg border border-line bg-white p-2" />
              <p className="text-xs text-faint">Or scan each other&apos;s code</p>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            {verified ? (
              <Button variant="secondary" onClick={onUnverify}>
                Remove verification
              </Button>
            ) : (
              <Button onClick={onVerify}>Mark as verified</Button>
            )}
            {canScan && (
              <Button variant="secondary" onClick={() => setScanning(true)}>
                Scan their code
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
