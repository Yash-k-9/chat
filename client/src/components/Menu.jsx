// Small dropdown menu anchored to a trigger button. Closes on outside click / Escape.
//   <Menu trigger={(props) => <button {...props}>…</button>} align="right">
//     <MenuItem icon={TrashIcon} danger onClick={…}>Delete</MenuItem>
//   </Menu>
import { useCallback, useRef, useState } from 'react';
import useDismiss from '../hooks/useDismiss.js';

export function Menu({ trigger, children, align = 'right', direction = 'down', width = 'w-56' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  return (
    <div ref={ref} className="relative">
      {trigger({ onClick: () => setOpen((o) => !o), 'aria-expanded': open, 'aria-haspopup': 'menu' })}
      {open && (
        <div
          role="menu"
          // Clicking an item closes the menu (items call their own onClick first).
          onClick={close}
          className={`absolute z-30 ${width} animate-pop-in rounded-xl border border-line bg-surface py-1.5 shadow-xl ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${direction === 'down' ? 'top-full mt-1.5' : 'bottom-full mb-1.5'}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ icon: Icon, danger = false, children, ...props }) {
  return (
    <button
      role="menuitem"
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-subtle ${
        danger ? 'text-danger' : 'text-fg'
      }`}
      {...props}
    >
      {Icon && <Icon className={`h-4 w-4 ${danger ? '' : 'text-muted'}`} />}
      {children}
    </button>
  );
}

export function MenuDivider() {
  return <div className="my-1.5 border-t border-line" />;
}
