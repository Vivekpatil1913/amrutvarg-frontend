// Decorative motif drawn from the session's opening command, "मंडलं कुरु"
// (form a circle): concentric rings with a circle of points.
export default function Mandala({ className, points = 24 }) {
  const dots = Array.from({ length: points }, (_, i) => {
    const a = (i / points) * Math.PI * 2;
    return { x: 200 + Math.cos(a) * 150, y: 200 + Math.sin(a) * 150 };
  });
  return (
    <svg className={className} viewBox="0 0 400 400" fill="none" aria-hidden="true" focusable="false">
      <circle className="mandala__ring mandala__ring--1" cx="200" cy="200" r="190" />
      <circle className="mandala__ring mandala__ring--2" cx="200" cy="200" r="150" />
      <circle className="mandala__ring mandala__ring--3" cx="200" cy="200" r="104" />
      <circle className="mandala__ring mandala__ring--4" cx="200" cy="200" r="58" />
      {dots.map((d, i) => (
        <circle key={i} className="mandala__dot" cx={d.x} cy={d.y} r="4.5" style={{ '--i': i }} />
      ))}
    </svg>
  );
}
