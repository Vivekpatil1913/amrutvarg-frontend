import { useEffect } from 'react';

// Marks every `[data-reveal]` element with `data-visible` once it scrolls into
// view. An attribute is used rather than a class because React owns
// `className`: any re-render that changes an element's class (e.g. an
// accordion toggling `is-open`) would wipe a class added here and hide the
// element again. React never touches attributes it did not render.
//
// Sections fed by the CMS swap their bundled fallback for fetched content after
// mount, and a changed React key replaces the DOM node instead of updating it.
// The replacement is a fresh element without `data-visible`, so a single sweep
// at mount would leave it stuck at `opacity: 0`. A MutationObserver catches
// those late arrivals and hands them to the same IntersectionObserver.
export function useReveal(deps = []) {
  useEffect(() => {
    const show = (el) => el.setAttribute('data-visible', '');
    const pending = (root) => root.querySelectorAll('[data-reveal]:not([data-visible])');

    if (!('IntersectionObserver' in window)) {
      pending(document).forEach(show);
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

    const watch = (root) => pending(root).forEach((n) => io.observe(n));
    watch(document);

    const mo = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          if (node.matches('[data-reveal]:not([data-visible])')) io.observe(node);
          watch(node);
        });
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
