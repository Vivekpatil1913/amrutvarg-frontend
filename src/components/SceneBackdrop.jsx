// Fixed, full-viewport ambient layer behind the page. Its gradient and light
// glows take their colours from CSS variables that change with <html data-scene>
// (see useSceneTheme), giving each section its own atmosphere.
export default function SceneBackdrop() {
  return (
    <div className="scene" aria-hidden="true">
      <span className="scene__glow scene__glow--a" />
      <span className="scene__glow scene__glow--b" />
      <span className="scene__grain" />
    </div>
  );
}
