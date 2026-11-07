import * as THREE from "../lib/three.module.min.js";
import { texturedBox } from "./vanilla-textures.js";

// Les dimensions UV restent celles du patron d'origine, même pour les couches gonflées.
export function createMobModel(kind, textures) {
  const group = new THREE.Group(),
    legs = [],
    pig = kind === "pig",
    zombie = kind === "zombie";
  const skin = new THREE.MeshLambertMaterial({
    map: textures[zombie ? 2 : pig ? 1 : 0],
    alphaTest: 0.5,
  });
  const wool =
    zombie || pig ? null : new THREE.MeshLambertMaterial({ map: textures[3], alphaTest: 0.5 });
  function part(name, w, h, d, u, v, x, y, z, material = skin, inflate = 0) {
    const mesh = texturedBox(w, h, d, u, v, material);
    // Agrandir la géométrie après les UV évite d'échantillonner les zones transparentes du skin.
    if (inflate)
      mesh.geometry.scale((w + inflate * 2) / w, (h + inflate * 2) / h, (d + inflate * 2) / d);
    mesh.name = name;
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  }
  if (zombie) {
    part("head", 8, 8, 8, 0, 0, 0, 1.75, 0);
    part("body", 8, 12, 4, 16, 16, 0, 1.125, 0);
    for (const [i, x] of [-0.125, 0.125].entries()) {
      // The joint stays on the pelvis; only the leg below the hip swings.
      const pivot = new THREE.Group();
      pivot.name = i === 0 ? "right_leg" : "left_leg";
      pivot.position.set(x, 0.75, 0);
      group.add(pivot);
      // This zombie skin uses the classic shared leg region; its lower half is empty.
      const leg = part("leg", 4, 12, 4, 0, 16, 0, -0.375, 0);
      if (i === 1) leg.scale.x = -1;
      group.remove(leg);
      pivot.add(leg);
      legs.push(pivot);
    }
    for (const x of [-0.375, 0.375]) {
      const arm = part("arm", 4, 12, 4, 40, 16, x, 1.35, -0.3);
      arm.rotation.x = -Math.PI / 2;
    }
  } else if (pig) {
    part("head", 8, 8, 8, 0, 0, 0, 0.75, -0.625);
    part("snout", 4, 3, 1, 16, 16, 0, 0.65625, -0.90625);
    part("body", 10, 16, 8, 28, 8, 0, 0.625, 0).rotation.x = -Math.PI / 2;
    for (const x of [-0.1875, 0.1875])
      for (const z of [-0.3125, 0.4375]) {
        legs.push(part("leg", 4, 6, 4, 0, 16, x, 0.1875, z));
      }
  } else {
    part("head", 6, 6, 8, 0, 0, 0, 1.1875, -0.625);
    part("body", 8, 16, 6, 28, 8, 0, 0.9375, 0).rotation.x = -Math.PI / 2;
    part("wool_body", 8, 16, 6, 28, 8, 0, 0.9375, 0, wool, 1.75).rotation.x = -Math.PI / 2;
    part("wool_head", 6, 6, 6, 0, 0, 0, 1.1875, -0.5625, wool, 0.6);
    for (const x of [-0.1875, 0.1875])
      for (const z of [-0.3125, 0.4375]) {
        // Pivot à la hanche : la laine et la patte se déplacent ensemble sans se déchirer.
        const pivot = new THREE.Group();
        pivot.position.set(x, 0.75, z);
        group.add(pivot);
        const leg = part("leg", 4, 12, 4, 0, 16, 0, -0.375, 0);
        group.remove(leg);
        pivot.add(leg);
        const coat = part("wool_leg", 4, 6, 4, 0, 16, 0, -0.1875, 0, wool, 0.5);
        group.remove(coat);
        pivot.add(coat);
        legs.push(pivot);
      }
  }
  group.name = kind;
  return { group, legs };
}
