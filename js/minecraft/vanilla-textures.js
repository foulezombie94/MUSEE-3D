import * as THREE from "../lib/three.module.min.js";
import { BLOCKS } from "./terrain.js";
export const ATLAS_WIDTH = 128,
  ATLAS_HEIGHT = 256;
export const ASSET = new URL("../../assets/minecraft/", import.meta.url).href;
const load = (src) =>
  new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error("Texture introuvable : " + src));
    im.src = ASSET + src;
  });
const [atlasImage, ...skinImages] = await Promise.all(
  [
    "atlas.png",
    "entity/sheep.png",
    "entity/pig.png",
    "entity/zombie.png",
    "entity/sheep_fur.png",
    "entity/steve.png",
  ].map(load),
);
export function createAtlas() {
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_WIDTH;
  canvas.height = ATLAS_HEIGHT;
  canvas.getContext("2d").drawImage(atlasImage, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  const icons = new Map();
  const tileCanvas = (tile, brightness = 1) => {
    const c = document.createElement("canvas");
    c.width = c.height = 16;
    const g = c.getContext("2d");
    g.drawImage(canvas, (tile % 8) * 16, Math.floor(tile / 8) * 16, 16, 16, 0, 0, 16, 16);
    if (brightness < 1) {
      g.globalCompositeOperation = "source-atop";
      g.fillStyle = `rgba(0,0,0,${1 - brightness})`;
      g.fillRect(0, 0, 16, 16);
    }
    return c;
  };
  return {
    texture,
    canvas,
    icon(id) {
      if (icons.has(id)) return icons.get(id);
      const b = BLOCKS[id],
        c = document.createElement("canvas");
      c.width = c.height = 32;
      const g = c.getContext("2d");
      g.imageSmoothingEnabled = false;
      const draw = (tile, shade, m) => {
        g.save();
        g.setTransform(...m);
        g.drawImage(tileCanvas(tile, shade), 0, 0);
        g.restore();
      };
      draw(b.tile, 1, [0.875, 0.5, -0.875, 0.5, 16, 0]);
      draw(b.side ?? b.tile, 0.72, [0.875, 0.5, 0, 1, 2, 8]);
      draw(b.front ?? b.side ?? b.tile, 0.86, [0.875, -0.5, 0, 1, 16, 16]);
      const url = c.toDataURL();
      icons.set(id, url);
      return url;
    },
  };
}
export function skinTexture(kind) {
  const i = { sheep: 0, pig: 1, zombie: 2, fur: 3, steve: 4 }[kind];
  const t = new THREE.Texture(skinImages[i]);
  t.needsUpdate = true;
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export function texturedBox(w, h, d, u, v, material, scale = 1 / 16) {
  const geo = new THREE.BoxGeometry(w * scale, h * scale, d * scale),
    uv = geo.attributes.uv;
  const width = material.map.image.width,
    height = material.map.image.height;
  const faces = [
    [u + d + w, v + d, d, h],
    [u, v + d, d, h],
    [u + d, v, w, d],
    [u + d + w, v, w, d],
    [u + 2 * d + w, v + d, w, h],
    [u + d, v + d, w, h],
  ];
  for (let face = 0; face < 6; face++) {
    const [x, y, fw, fh] = faces[face];
    const points = [
      [x, y],
      [x + fw, y],
      [x, y + fh],
      [x + fw, y + fh],
    ];
    for (let i = 0; i < 4; i++)
      uv.setXY(face * 4 + i, points[i][0] / width, 1 - points[i][1] / height);
  }
  uv.needsUpdate = true;
  return new THREE.Mesh(geo, material);
}
