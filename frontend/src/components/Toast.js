import { useEffect } from 'react';

export default function Toast({ message, visible, onHide }) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onHide, 3800);
      return () => clearTimeout(timer);
    }
  }, [visible, onHide]);

  return (
    <div className={`toast ${visible ? 'show' : ''}`}>
      <span className="t-icon">✓</span>
      <span>{message}</span>
    </div>
  );
}
