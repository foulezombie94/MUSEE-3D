import { VoxelWorld } from "./terrain.js";
import { buildChunkData } from "./mesh-data.js";
let world;
self.onmessage = ({ data }) => {
  try {
    if (data.type === "init") {
      world = new VoxelWorld(data.seed, data.edits);
      return;
    }
    if (data.type === "edit") {
      world.set(data.x, data.y, data.z, data.id);
      return;
    }
    if (data.type !== "mesh" || !world) return;
    const chunk = world.generate(data.cx, data.cz),
      mesh = buildChunkData(world, chunk);
    const transfer = [...Object.values(mesh.opaque), ...Object.values(mesh.water)].map(
      (a) => a.buffer,
    );
    self.postMessage({ type: "mesh", token: data.token, ...mesh }, transfer);
    for (const [k, c] of world.chunks)
      if (Math.abs(c.cx - data.cx) > 5 || Math.abs(c.cz - data.cz) > 5) world.chunks.delete(k);
  } catch (error) {
    self.postMessage({ type: "error", message: String(error) });
  }
};
