import { useCallback, useEffect, useState } from 'react';

const reducedMotionQuery = () => window.matchMedia?.('(prefers-reduced-motion: reduce)');

// One-at-a-time rotation through `count` items, every `ms` milliseconds.
//
// Rotation pauses while the panel is hovered with a mouse or holds keyboard
// focus, and is off for visitors who ask for reduced motion. `prev` / `next`
// step by hand; the timer restarts from the item they land on.
//
// Spread `hold` on the element whose hover/focus should pause it.
export function useRotation(count, ms) {
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [reduced, setReduced] = useState(() => Boolean(reducedMotionQuery()?.matches));

  useEffect(() => {
    const mq = reducedMotionQuery();
    if (!mq) return undefined;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const current = count ? index % count : 0;
  const rotating = count > 1 && !held && !reduced;

  // One timer per shown item.
  useEffect(() => {
    if (!rotating) return undefined;
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % count), ms);
    return () => window.clearTimeout(id);
  }, [rotating, current, count, ms]);

  const next = useCallback(() => setIndex((i) => (count ? ((i % count) + 1) % count : 0)), [count]);
  const prev = useCallback(() => setIndex((i) => (count ? ((i % count) - 1 + count) % count : 0)), [count]);

  // Hover pauses only for a real mouse, and focus only for keyboard focus: on
  // touch screens a tap would otherwise leave the rotation paused for good.
  const hold =
    count > 1
      ? {
          onPointerEnter: (e) => e.pointerType === 'mouse' && setHeld(true),
          onPointerLeave: (e) => e.pointerType === 'mouse' && setHeld(false),
          onFocus: (e) => e.target.matches(':focus-visible') && setHeld(true),
          onBlur: (e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setHeld(false);
          },
        }
      : {};

  return { current, rotating, next, prev, hold };
}
