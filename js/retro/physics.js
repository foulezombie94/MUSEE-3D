export function overlaps(a, b) {
  return a.x + a.w > b.x && a.x < b.x + b.w && a.y + a.h > b.y && a.y < b.y + b.h;
}

// Continuous relative collision. A fast actor cannot jump over a narrow enemy.
export function sweptAABB(a, b, dx, dy) {
  if (overlaps(a, b)) return { time: 0, nx: 0, ny: a.y + a.h <= b.y + 3 ? -1 : 0 };
  const axis = (position, size, target, targetSize, delta) => {
    if (delta === 0)
      return position + size <= target || position >= target + targetSize
        ? [Infinity, -Infinity]
        : [-Infinity, Infinity];
    const first = (target - position - size) / delta,
      last = (target + targetSize - position) / delta;
    return delta > 0 ? [first, last] : [last, first];
  };
  const [enterX, exitX] = axis(a.x, a.w, b.x, b.w, dx),
    [enterY, exitY] = axis(a.y, a.h, b.y, b.h, dy);
  const enter = Math.max(enterX, enterY),
    exit = Math.min(exitX, exitY);
  if (enter > exit || exit < 0 || enter < 0 || enter > 1) return null;
  return {
    time: enter,
    nx: enterX > enterY ? (dx > 0 ? -1 : 1) : 0,
    ny: enterY >= enterX ? (dy > 0 ? -1 : 1) : 0,
  };
}

// Resolve small swept steps on both axes. Foot contact survives later zero-dy steps.
export function moveOnTiles(body, dt, tile, onHit = () => {}) {
  const steps = Math.max(1, Math.ceil((Math.max(Math.abs(body.vx), Math.abs(body.vy)) * dt) / 3));
  body.grounded = false;
  const contacts = (axis) => {
    let nearest = null;
    for (let y = Math.floor(body.y / 16); y <= Math.floor((body.y + body.h - 0.001) / 16); y++) {
      for (let x = Math.floor(body.x / 16); x <= Math.floor((body.x + body.w - 0.001) / 16); x++) {
        const id = tile(x, y);
        if (!id) continue;
        const limit =
          axis === "x"
            ? body.vx > 0
              ? x * 16 - body.w
              : (x + 1) * 16
            : body.vy >= 0
              ? y * 16 - body.h
              : (y + 1) * 16;
        if (
          !nearest ||
          ((axis === "x" ? body.vx : body.vy) >= 0 && limit < nearest.limit) ||
          ((axis === "x" ? body.vx : body.vy) < 0 && limit > nearest.limit)
        )
          nearest = { x, y, id, limit };
      }
    }
    return nearest;
  };
  for (let i = 0; i < steps; i++) {
    const h = dt / steps;
    body.x += body.vx * h;
    const horizontal = contacts("x");
    if (horizontal) {
      const normal = body.vx > 0 ? -1 : 1;
      body.x = horizontal.limit;
      body.vx = 0;
      onHit(horizontal, normal, 0);
    }
    body.y += body.vy * h;
    const vertical = contacts("y");
    if (vertical) {
      const normal = body.vy >= 0 ? -1 : 1;
      body.y = vertical.limit;
      if (normal === -1) body.grounded = true;
      body.vy = 0;
      onHit(vertical, 0, normal);
    }
  }
}
