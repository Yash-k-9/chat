// Before sending a photo/video: show a preview and let the user add a caption.
import { useEffect, useState } from 'react';
import Modal from '../Modal.jsx';
import Button from '../Button.jsx';
import Alert from '../Alert.jsx';
import { formatBytes, isTooLarge, MAX_FILE_MB } from '../../chat/mediaPrep.js';
import { LockIcon } from '../Icons.jsx';

export default function MediaPreviewModal({ file, onCancel, onSend }) {
  const [caption, setCaption] = useState('');
  const [url, setUrl] = useState('');
  const isVideo = file.type.startsWith('video/');
  const tooLarge = isTooLarge(file);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  function send(event) {
    event.preventDefault();
    if (!tooLarge) onSend(file, caption.trim());
  }

  return (
    <Modal title={isVideo ? 'Send video' : 'Send photo'} onClose={onCancel} size="lg">
      <form onSubmit={send} className="space-y-4">
        <div className="flex max-h-[50dvh] items-center justify-center overflow-hidden rounded-xl bg-slate-900">
          {url &&
            (isVideo ? (
              <video src={url} controls playsInline className="max-h-[50dvh] w-full object-contain" />
            ) : (
              <img src={url} alt="Preview" className="max-h-[50dvh] w-full object-contain" />
            ))}
        </div>

        {tooLarge ? (
          <Alert>
            This file is {formatBytes(file.size)}. The limit is {MAX_FILE_MB} MB.
          </Alert>
        ) : (
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <LockIcon className="h-3.5 w-3.5" />
            {isVideo
              ? 'Encrypted on your device before upload.'
              : 'Location and camera details are removed, then the photo is encrypted on your device.'}
          </p>
        )}

        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Add a caption…"
          maxLength={1000}
          autoFocus
          className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft focus-visible:outline-none"
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" fullWidth={false} onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" fullWidth={false} disabled={tooLarge}>
            Send
          </Button>
        </div>
      </form>
    </Modal>
  );
}
