import * as THREE from "../lib/three.module.min.js";
import { SIZE, HEIGHT, B, BLOCKS, transparent, index } from "./terrain.js";
import { ATLAS_WIDTH, ATLAS_HEIGHT } from "./vanilla-textures.js";
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
export function buildChunk(world, chunk, scene, material, waterMaterial) {
  const opaque = { p: [], n: [], uv: [], c: [] },
    water = { p: [], n: [], uv: [], c: [] };
  const x0 = chunk.cx * SIZE,
    z0 = chunk.cz * SIZE;
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
            neighbor = world.get(wx + n[0], y + n[1], wz + n[2]);
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
          for (const vi of [0, 1, 2, 0, 2, 3]) {
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
              const occ = (p) => !transparent(world.get(...p));
              const ao = (occ(a) ? 1 : 0) + (occ(b) ? 1 : 0) + (occ(d) ? 1 : 0);
              shade *= 1 - ao * 0.12;
              if (id === B.LAMP) shade = 1.2;
            }
            out.p.push(
              wx + v[0],
              y +
                v[1] -
                (id === B.WATER && v[1] === 1 && world.get(wx, y + 1, wz) !== B.WATER ? 0.13 : 0),
              wz + v[2],
            );
            out.n.push(...n);
            out.uv.push(...uv[vi]);
            out.c.push(shade, shade, shade);
          }
        }
      }
  const mesh = (data, mat) => {
    if (!data.p.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(data.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(data.n, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(data.uv, 2));
    g.setAttribute("color", new THREE.Float32BufferAttribute(data.c, 3));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat);
    scene.add(m);
    return m;
  };
  for (const m of [chunk.mesh, chunk.water])
    if (m) {
      scene.remove(m);
      m.geometry.dispose();
    }
  chunk.mesh = mesh(opaque, material);
  chunk.water = mesh(water, waterMaterial);
  chunk.dirty = false;
}
