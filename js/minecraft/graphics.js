export const GRAPHICS = {
  low: {
    name: "PC faible",
    radius: 2,
    pixels: 1280 * 720,
    ratio: 1,
    clouds: 8,
    particles: 160,
    fragments: 24,
  },
  balanced: {
    name: "Équilibré",
    radius: 3,
    pixels: 1600 * 900,
    ratio: 1,
    clouds: 18,
    particles: 256,
    fragments: 40,
  },
  high: {
    name: "Qualité",
    radius: 3,
    pixels: 2560 * 1440,
    ratio: 1.7,
    clouds: 35,
    particles: 384,
    fragments: 64,
  },
};
export function readGraphics() {
  try {
    const value = localStorage.getItem("continue-graphics");
    return GRAPHICS[value] ? value : "low";
  } catch {
    return "low";
  }
}
export function saveGraphics(value) {
  try {
    localStorage.setItem("continue-graphics", value);
  } catch {}
}
export function renderRatio(profile, width, height, dpr = 1) {
  return Math.max(
    0.1,
    Math.min(dpr, profile.ratio, Math.sqrt(profile.pixels / Math.max(1, width * height))),
  );
}
