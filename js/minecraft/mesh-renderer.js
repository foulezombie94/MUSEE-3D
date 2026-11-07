import * as THREE from "../lib/three.module.min.js";
export function applyChunkMesh(chunk, data, scene, material, waterMaterial) {
  const mesh = (d, mat) => {
    if (!d.p.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(d.p, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(d.n, 3, true));
    g.setAttribute("uv", new THREE.BufferAttribute(d.uv, 2));
    g.setAttribute("color", new THREE.BufferAttribute(d.c, 3));
    g.setIndex(new THREE.BufferAttribute(d.indices, 1));
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
  chunk.mesh = mesh(data.opaque, material);
  chunk.water = mesh(data.water, waterMaterial);
  chunk.dirty = false;
}
