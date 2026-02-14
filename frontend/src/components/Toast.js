import { useEffect } from 'react';

export default function Toast({ message, visible, onHide }) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onHide, 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [visible, onHide]);

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 rounded bg-ink px-4 py-2 text-sm text-parchment shadow-xl transition ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      {message}
    </div>
  );
}
