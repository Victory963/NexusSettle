export function posterStyle(seed: number) {
  const h1 = seed % 360;
  const h2 = (seed * 13 + 40) % 360;
  const h3 = (seed * 29 + 90) % 360;
  return {
    background: `linear-gradient(145deg, hsl(${h1} 28% 14%), hsl(${h2} 42% 22%) 48%, hsl(${h3} 30% 10%))`,
  };
}
