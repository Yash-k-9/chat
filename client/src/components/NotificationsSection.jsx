// Settings → Notifications: turn push notifications on/off for this browser.
import { useEffect, useState } from 'react';
import { disablePush, enablePush, getPushStatus } from '../realtime/push.js';
import SettingsSection from './SettingsSection.jsx';
import Button from './Button.jsx';
import Alert from './Alert.jsx';
import { BellIcon } from './Icons.jsx';

const MESSAGES = {
  unsupported: 'This browser does not support push notifications.',
  unavailable: 'Push notifications are not set up on the server yet.',
  denied: 'Notifications are blocked for this site. Allow them in your browser settings.',
};

export default function NotificationsSection() {
  const [status, setStatus] = useState('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getPushStatus()
      .then(setStatus)
      .catch(() => setStatus('unavailable'));
  }, []);

  async function toggle() {
    setBusy(true);
    setError('');
    try {
      if (status === 'on') {
        await disablePush();
        setStatus('off');
      } else {
        await enablePush();
        setStatus('on');
      }
    } catch (err) {
      setError(err.message);
      setStatus(await getPushStatus().catch(() => 'off'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsSection
      icon={BellIcon}
      title="Notifications"
      description="Get notified about new messages when the app is closed. Notifications never show message text."
    >
      {MESSAGES[status] ? (
        <p className="text-sm text-muted">{MESSAGES[status]}</p>
      ) : (
        <div className="space-y-3">
          {error && <Alert>{error}</Alert>}
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm">
              <span className={`h-2 w-2 rounded-full ${status === 'on' ? 'bg-success' : 'bg-faint'}`} />
              <span className="text-muted">{status === 'loading' ? 'Checking…' : status === 'on' ? 'On for this browser' : 'Off'}</span>
            </span>
            <Button
              variant={status === 'on' ? 'secondary' : 'primary'}
              fullWidth={false}
              loading={busy}
              disabled={status === 'loading'}
              onClick={toggle}
            >
              {status === 'on' ? 'Turn off' : 'Turn on'}
            </Button>
          </div>
        </div>
      )}
    </SettingsSection>
  );
}
