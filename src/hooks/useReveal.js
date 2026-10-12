import { useEffect } from 'react';

// Marks every `[data-reveal]` element with `data-visible` once it scrolls into
// view. An attribute is used rather than a class because React owns
// `className`: any re-render that changes an element's class (e.g. an
// accordion toggling `is-open`) would wipe a class added here and hide the
// element again. React never touches attributes it did not render.
export function useReveal(deps = []) {
  useEffect(() => {
    const nodes = document.querySelectorAll('[data-reveal]:not([data-visible])');
    const show = (el) => el.setAttribute('data-visible', '');
    if (!('IntersectionObserver' in window)) {
      nodes.forEach(show);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            show(entry.target);
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
