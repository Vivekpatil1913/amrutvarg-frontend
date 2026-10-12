import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

// Counts from 0 to `value` once the number scrolls into view.
// Renders the final value immediately for reduced-motion users or without IntersectionObserver.
export default function CountUp({ value, duration = 1200 }) {
  const { num } = useLanguage();
  const ref = useRef(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      return undefined;
    }
    let frame = 0;
    setShown(0);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min(1, (now - start) / duration);
          setShown(Math.round(value * (1 - (1 - p) ** 3)));
          if (p < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  return (
    <span ref={ref} aria-label={num(value)}>
      <span aria-hidden="true">{num(shown)}</span>
    </span>
  );
}
