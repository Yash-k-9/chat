// Close a popover when the user clicks outside it or presses Escape.
import { useEffect } from 'react';

export default function useDismiss(ref, open, onClose) {
  useEffect(() => {
    if (!open) return;

    function handlePointer(event) {
      if (ref.current && !ref.current.contains(event.target)) onClose();
    }
    function handleKey(event) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [ref, open, onClose]);
}
