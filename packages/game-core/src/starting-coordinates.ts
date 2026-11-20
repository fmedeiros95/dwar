export type Coordinates = { x: number; y: number };

export function startingCoordinates(
  occupied: readonly Coordinates[],
  randomInteger: (minimum: number, maximumInclusive: number) => number,
): Coordinates {
  // beta/create_village.php: random quadrant and point on a growing circle.
  const direction = randomInteger(1, 4);
  const radius = Math.sqrt(occupied.length) + 2;
  let x = randomInteger(0, Math.floor(radius));
  if (direction === 2 || direction === 3) x *= -1;
  let y = Math.cos(Math.asin(x / radius)) * radius;
  if (direction === 3 || direction === 4) y *= -1;
  x = Math.round(x + 500);
  y = Math.round(y + 500);
  const positions = new Set(occupied.map((point) => `${point.x},${point.y}`));
  let attempts = 0;
  while (positions.has(`${x},${y}`) && attempts++ < 512) {
    x += randomInteger(-2, 2);
    y += randomInteger(-2, 2);
  }
  // Keep the legacy random walk, but guarantee termination if it keeps colliding.
  let dx = 1,
    dy = 0,
    length = 1,
    steps = 0,
    turns = 0;
  while (positions.has(`${x},${y}`)) {
    x += dx;
    y += dy;
    if (++steps === length) {
      [dx, dy] = [-dy, dx];
      steps = 0;
      if (++turns % 2 === 0) length++;
    }
  }
  return { x, y };
}
