import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { settle, duration, easeOut } from '../../motion/index.js';
import { useIsDesktop } from '../../hooks/useMediaQuery.js';
import { IconButton } from './Button.jsx';

/**
 * The app's one overlay pattern — filters, quick view, save-to-list.
 *
 * Form factor is the point: on a phone it's a bottom sheet you can throw
 * closed with your thumb; on a desktop it's a side panel. Same component,
 * same props, because a bottom sheet on a 1440px screen is a scaled-down
 * mobile layout, which the brief explicitly rules out.
 *
 * Dismissal is deliberately generous: drag, backdrop tap, Escape, or the
 * close button.
 */
export default function Drawer({
  open,
  onClose,
  title,
  description,
  side = 'auto',
  children,
  footer,
}) {
  const isDesktop = useIsDesktop();
  const resolved = side === 'auto' ? (isDesktop ? 'right' : 'bottom') : side;
  const panelRef = useRef(null);
  const restoreFocus = useRef(null);

  // Escape to close, and lock the page behind the overlay so the background
  // doesn't scroll under a bottom sheet.
  useEffect(() => {
    if (!open) return;
    restoreFocus.current = document.activeElement;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus into the panel so keyboard and screen-reader users land here.
    const t = setTimeout(() => panelRef.current?.focus(), 60);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      clearTimeout(t);
      restoreFocus.current?.focus?.();
    };
  }, [open, onClose]);

  // Keep Tab inside the panel while it's open.
  function onKeyDown(e) {
    if (e.key !== 'Tab') return;
    const focusables = panelRef.current?.querySelectorAll(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (!focusables?.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const isBottom = resolved === 'bottom';

  const panelMotion = isBottom
    ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }
    : {
        initial: { x: resolved === 'right' ? '100%' : '-100%' },
        animate: { x: 0 },
        exit: { x: resolved === 'right' ? '100%' : '-100%' },
      };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex" role="presentation">
          <motion.div
            className="absolute inset-0 bg-charcoal/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: duration.quick, ease: easeOut } }}
            onClick={onClose}
            aria-hidden
          />

          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onKeyDown={onKeyDown}
            className={[
              'relative flex flex-col bg-bg shadow-[var(--shadow-panel)] outline-none',
              isBottom
                ? 'mt-auto max-h-[88vh] w-full rounded-t-panel pb-safe'
                : `ml-auto h-full w-full max-w-md ${resolved === 'left' ? 'mr-auto ml-0' : ''}`,
            ].join(' ')}
            {...panelMotion}
            transition={settle}
            /* Thumb-throw dismissal, phone only. A 90px drag or a fast flick
               closes it; anything less springs back. */
            drag={isBottom ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 550) onClose();
            }}
          >
            {isBottom && (
              <div className="flex justify-center pt-3 pb-1" aria-hidden>
                <span className="h-1.5 w-11 rounded-full bg-line-strong" />
              </div>
            )}

            <header className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold">{title}</h2>
                {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
              </div>
              <IconButton icon={X} label="Close" onClick={onClose} size={40} variant="quiet" />
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>

            {footer && (
              <div className="border-t border-line bg-surface px-5 py-3.5">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
