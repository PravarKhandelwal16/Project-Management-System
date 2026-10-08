import { useEffect, useRef } from 'react';
export default function ManagementDialog({ title, onClose, busy, compact, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = ref.current;
    (dialog.querySelector('input:not(:disabled), select:not(:disabled)') || dialog.querySelector('button'))?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <div className="management-overlay" onKeyDown={event => {
    if (event.key === 'Escape' && !busy) { event.stopPropagation(); onClose(); }
    if (event.key === 'Tab') {
      const controls = [...ref.current.querySelectorAll('button, input, select, a[href], textarea')].filter(item => !item.disabled && item.tabIndex !== -1);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }}>
    <section ref={ref} className={'management-dialog ' + (compact ? 'compact' : '')} role="dialog" aria-modal="true" aria-labelledby="management-dialog-title">
      <header><h2 id="management-dialog-title">{title}</h2><button aria-label="Close dialog" disabled={busy} onClick={onClose}>?</button></header>
      {children}
    </section>
  </div>;
}
