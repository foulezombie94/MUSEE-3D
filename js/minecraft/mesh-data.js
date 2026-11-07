import { SIZE, HEIGHT, B, BLOCKS, transparent, index } from "./terrain.js";
const ATLAS_WIDTH = 128,
  ATLAS_HEIGHT = 256;
const FACES = [
  {
    n: [1, 0, 0],
    v: [
      [1, 0, 1],
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
    ],
    light: 0.82,
  },
  {
    n: [-1, 0, 0],
    v: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
    light: 0.76,
  },
  {
    n: [0, 1, 0],
    v: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
    light: 1,
  },
  {
    n: [0, -1, 0],
    v: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
    light: 0.52,
  },
  {
    n: [0, 0, 1],
    v: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
    light: 0.9,
  },
  {
    n: [0, 0, -1],
    v: [
      [1, 0, 0],
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
    light: 0.7,
  },
];
export function buildChunkData(world, chunk) {
  const opaque = { p: [], n: [], uv: [], c: [], indices: [] },
    water = { p: [], n: [], uv: [], c: [], indices: [] };
  const x0 = chunk.cx * SIZE,
    z0 = chunk.cz * SIZE;
  const side = SIZE + 2,
    padded = new Uint8Array(side * side * (HEIGHT + 2));
  for (let y = -1; y <= HEIGHT; y++)
    for (let z = -1; z <= SIZE; z++)
      for (let x = -1; x <= SIZE; x++)
        padded[x + 1 + side * (z + 1 + side * (y + 1))] =
          y < 0
            ? B.BEDROCK
            : y >= HEIGHT
              ? 0
              : x >= 0 && x < SIZE && z >= 0 && z < SIZE
                ? chunk.data[index(x, y, z)]
                : world.get(x0 + x, y, z0 + z);
  const get = (x, y, z) => padded[x - x0 + 1 + side * (z - z0 + 1 + side * (y + 1))] ?? 0;
  for (let y = 0; y < HEIGHT; y++)
    for (let z = 0; z < SIZE; z++)
      for (let x = 0; x < SIZE; x++) {
        const id = chunk.data[index(x, y, z)];
        if (!id) continue;
        const wx = x + x0,
          wz = z + z0;
        for (let f = 0; f < 6; f++) {
          const face = FACES[f],
            n = face.n,
            neighbor = get(wx + n[0], y + n[1], wz + n[2]);
          if (
            id === B.WATER
              ? neighbor !== B.AIR && neighbor !== B.GLASS
              : !transparent(neighbor) || (neighbor === id && (id === B.GLASS || id === B.LEAF))
          )
            continue;
          if (id !== B.WATER && neighbor === B.WATER && f === 3) continue;
          const tile =
            f === 2
              ? BLOCKS[id].tile
              : f === 3
                ? (BLOCKS[id].bottom ?? BLOCKS[id].tile)
                : f === 5
                  ? (BLOCKS[id].front ?? BLOCKS[id].side ?? BLOCKS[id].tile)
                  : (BLOCKS[id].side ?? BLOCKS[id].tile);
          const u0 = ((tile % 8) * 16 + 0.05) / ATLAS_WIDTH,
            u1 = ((tile % 8) * 16 + 15.95) / ATLAS_WIDTH;
          const v1 = 1 - (Math.floor(tile / 8) * 16 + 0.05) / ATLAS_HEIGHT,
            v0 = 1 - (Math.floor(tile / 8) * 16 + 15.95) / ATLAS_HEIGHT;
          const uv = [
              [u0, v0],
              [u1, v0],
              [u1, v1],
              [u0, v1],
            ],
            out = id === B.WATER ? water : opaque;
          const axes = [0, 1, 2].filter((a) => n[a] === 0);
          const first = out.p.length / 3;
          for (const vi of [0, 1, 2, 3]) {
            const v = face.v[vi];
            let shade = face.light;
            if (id !== B.WATER) {
              const a = [wx + n[0], y + n[1], wz + n[2]],
                b = [...a],
                d = [...a];
              a[axes[0]] += v[axes[0]] ? 1 : -1;
              b[axes[1]] += v[axes[1]] ? 1 : -1;
              d[axes[0]] += v[axes[0]] ? 1 : -1;
              d[axes[1]] += v[axes[1]] ? 1 : -1;
              const occ = (p) => !transparent(get(...p));
              const ao = (occ(a) ? 1 : 0) + (occ(b) ? 1 : 0) + (occ(d) ? 1 : 0);
              shade *= 1 - ao * 0.12;
              if (id === B.LAMP) shade = 1.2;
            }
            out.p.push(
              wx + v[0],
              y +
                v[1] -
                (id === B.WATER && v[1] === 1 && get(wx, y + 1, wz) !== B.WATER ? 0.13 : 0),
              wz + v[2],
            );
            out.n.push(n[0] * 127, n[1] * 127, n[2] * 127);
            out.uv.push(...uv[vi]);
            out.c.push(shade, shade, shade);
          }
          out.indices.push(first, first + 1, first + 2, first, first + 2, first + 3);
        }
      }
  const pack = (data) => ({
    p: new Float32Array(data.p),
    n: new Int8Array(data.n),
    uv: new Float32Array(data.uv),
    c: new Float32Array(data.c),
    indices:
      data.p.length / 3 > 65535 ? new Uint32Array(data.indices) : new Uint16Array(data.indices),
  });
  return { opaque: pack(opaque), water: pack(water) };
}
