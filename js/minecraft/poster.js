// Une image fixe du vrai jeu : aucun moteur 3D supplémentaire ne tourne dans le tableau.
const asset = new URL("../../assets/minecraft/", import.meta.url);
const load = (path) =>
  new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = new URL(path, asset).href;
  });
const [world, logo] = await Promise.all([load("museum-world.png"), load("gui/minecraft.png")]);
const poster = document.createElement("canvas");
poster.width = 960;
poster.height = 600;
const g = poster.getContext("2d");
g.fillStyle = "#81b6e7";
g.fillRect(0, 0, 960, 600);
if (world) g.drawImage(world, 0, 0, 960, 600);
const shade = g.createLinearGradient(0, 0, 0, 220);
shade.addColorStop(0, "#14231388");
shade.addColorStop(1, "#14231300");
g.fillStyle = shade;
g.fillRect(0, 0, 960, 220);
if (logo) {
  g.imageSmoothingEnabled = false;
  g.drawImage(logo, 144, 20, 672, 168);
} else {
  g.font = "bold 72px monospace";
  g.fillStyle = "white";
  g.textAlign = "center";
  g.fillText("MINECRAFT", 480, 112);
}
g.fillStyle = "#142515ee";
g.fillRect(0, 530, 960, 70);
g.fillStyle = "#8fc85d";
g.fillRect(0, 530, 960, 3);
g.font = "bold 28px 'Courier New',monospace";
g.textAlign = "center";
g.textBaseline = "middle";
g.fillStyle = "#ecf7de";
g.fillText("E / CLIC POUR JOUER", 480, 568);
export function dessinerPosterMinecraft(canvas, width, height) {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(poster, 0, 0, width, height);
  return canvas;
}
