import * as THREE from "../lib/three.module.min.js";
import { hash, BLOCKS } from "./terrain.js";

// Textures originales de 16 × 16 pixels, dessinées localement, sans téléchargement.
export function createAtlas() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const palettes = [
    "#669b38",
    "#8a633d",
    "#8a633d",
    "#868987",
    "#73502c",
    "#b58b51",
    "#427527",
    "#d8ce96",
    "#b99257",
    "#a25c45",
    "#d2f0ef",
    "#3f83c9",
    "#858583",
    "#858583",
    "#45434a",
    "#a37a45",
    "#ac824c",
    "#efca6c",
  ];
  const rgb = (hex) => hex.match(/[\da-f]{2}/gi).map((v) => parseInt(v, 16));
  for (let tile = 0; tile < palettes.length; tile++) {
    const ox = (tile % 8) * 16,
      oy = Math.floor(tile / 8) * 16;
    ctx.save();
    ctx.translate(ox, oy);
    const c = rgb(palettes[tile]);
    const pixel = (x, y, color, w = 1, h = 1) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    };
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const n = (hash(x, y, tile * 319 + 4) - 0.5) * 44;
        pixel(x, y, `rgb(${c.map((v) => Math.max(0, Math.min(255, v + n))).join(",")})`);
      }
    if (tile === 1) {
      for (let x = 0; x < 16; x++)
        for (let y = 0; y < 3 + Math.floor(hash(x, 1) * 3); y++)
          pixel(x, y, y === 0 ? "#77a948" : hash(x, y) > 0.5 ? "#659637" : "#5b8e31");
    }
    if ([1, 2].includes(tile))
      for (let i = 0; i < 16; i++) pixel(i, Math.floor(hash(i, 9) * 13) + 3, "#ad8e6d");
    if (tile === 3 || tile === 12 || tile === 13 || tile === 14) {
      for (let i = 0; i < 23; i++) {
        const x = Math.floor(hash(i, 7) * 15),
          y = Math.floor(hash(i, 8) * 15);
        pixel(x, y, "#747874", 2);
        if (i % 3 === 0) pixel(x, y + 1, "#a2a4a0");
      }
      if (tile === 12 || tile === 13)
        for (let i = 0; i < 11; i++) {
          const x = Math.floor(hash(i, 31) * 14),
            y = Math.floor(hash(i, 32) * 14);
          pixel(x, y, tile === 12 ? "#292b29" : "#d0a58c", 2, 2);
          pixel(x + 1, y + 1, tile === 12 ? "#454441" : "#9a7563");
        }
    }
    if (tile === 4)
      for (let x = 0; x < 16; x++)
        for (let y = 0; y < 16; y++)
          if ((x + Math.floor(hash(y >> 2, x) * 2)) % 4 === 0) pixel(x, y, "#4d361e");
    if (tile === 5)
      for (let r = 1; r <= 7; r += 2) {
        ctx.strokeStyle = r % 4 === 1 ? "#79552f" : "#d0a364";
        ctx.lineWidth = 1;
        ctx.strokeRect(7 - r + 0.5, 7 - r + 0.5, r * 2, r * 2);
      }
    if (tile === 6)
      for (let x = 0; x < 16; x++)
        for (let y = 0; y < 16; y++) {
          const n = hash(x, y, 901);
          if (n > 0.88) ctx.clearRect(x, y, 1, 1);
          else if (n > 0.6) pixel(x, y, "#568b32", 2);
          else if (n < 0.2) pixel(x, y, "#2b5626");
        }
    if ([8, 15, 16].includes(tile))
      for (let y = 3; y < 16; y += 4) {
        pixel(0, y, "#72502c", 16);
        pixel(y % 8 ? 4 : 11, y - 3, "#775632", 1, 3);
        pixel(0, y + 1, "#d0ad6c", 16);
      }
    if (tile === 15) {
      pixel(1, 1, "#4d351e", 14, 14);
      pixel(2, 2, "#bc945a", 12, 12);
      for (let x = 5; x < 13; x += 4) pixel(x, 2, "#674827", 1, 12);
      for (let y = 5; y < 13; y += 4) pixel(2, y, "#674827", 12);
    }
    if (tile === 16) {
      pixel(2, 3, "#4c3524", 3, 9);
      pixel(10, 3, "#4c3524", 3, 9);
      pixel(6, 6, "#d9ba7a", 3, 3);
    }
    if (tile === 9)
      for (let y = 0; y < 16; y += 4) {
        pixel(0, y, "#bcb09b", 16);
        for (let x = y % 8 ? 4 : 0; x < 16; x += 8) {
          pixel(x, y, "#bcb09b", 1, 4);
          pixel(x + 1, y + 1, "#be7861", 6);
        }
      }
    if (tile === 10) {
      ctx.clearRect(0, 0, 16, 16);
      ctx.strokeStyle = "#c4e9e8";
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, 15, 15);
      pixel(2, 3, "#dbf6f4", 1, 3);
      pixel(3, 2, "#dbf6f4", 3);
      pixel(9, 10, "#dbf6f4", 3);
    }
    if (tile === 11)
      for (let i = 0; i < 9; i++)
        pixel(Math.floor(hash(i, 91) * 14), Math.floor(hash(i, 92) * 16), "#609acb", 3);
    if (tile === 17) {
      pixel(0, 0, "#6e4624", 16, 2);
      pixel(0, 14, "#6e4624", 16, 2);
      pixel(0, 0, "#6e4624", 2, 16);
      pixel(14, 0, "#6e4624", 2, 16);
      pixel(5, 4, "#fff5bd", 6, 8);
      pixel(6, 3, "#ffe889", 4, 10);
    }
    ctx.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return {
    texture,
    canvas,
    icon(id) {
      const c = document.createElement("canvas");
      c.width = c.height = 16;
      const tile = BLOCKS[id].side ?? BLOCKS[id].tile;
      c.getContext("2d").drawImage(
        canvas,
        (tile % 8) * 16,
        Math.floor(tile / 8) * 16,
        16,
        16,
        0,
        0,
        16,
        16,
      );
      return c.toDataURL();
    },
  };
}

export function skinTexture(kind) {
  const c = document.createElement("canvas");
  c.width = c.height = 16;
  const g = c.getContext("2d");
  const base = kind === "pig" ? "#dc9b9b" : kind === "zombie" ? "#5c8e47" : "#eee9d8";
  g.fillStyle = base;
  g.fillRect(0, 0, 16, 16);
  for (let i = 0; i < 60; i++) {
    g.fillStyle = kind === "pig" ? "#ca8787" : kind === "zombie" ? "#4c793c" : "#d9d5c7";
    g.fillRect(Math.floor(hash(i, 5) * 16), Math.floor(hash(i, 6) * 16), 2, 2);
  }
  g.fillStyle = kind === "zombie" ? "#172610" : "#252323";
  g.fillRect(3, 5, 2, 2);
  g.fillRect(11, 5, 2, 2);
  g.fillStyle = kind === "pig" ? "#bc757e" : kind === "zombie" ? "#284120" : "#aaa49b";
  g.fillRect(6, 9, 4, 3);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
