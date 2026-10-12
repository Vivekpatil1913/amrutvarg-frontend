import { useEffect } from 'react';

// Sets <html data-scene="…"> to the id of whichever section crosses the middle
// of the viewport. The ambient backdrop's colours are keyed off that attribute
// in CSS and transition there, so scrolling never triggers a React render.
export function useSceneTheme(ids) {
  useEffect(() => {
    const root = document.documentElement;
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (!els.length || !('IntersectionObserver' in window)) return undefined;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) root.dataset.scene = entry.target.id;
        });
      },
      // A thin band across the middle of the viewport.
      { rootMargin: '-49% 0px -49% 0px', threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      delete root.dataset.scene;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
