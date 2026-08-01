import sharp from "sharp";
// Promote INTERIOR partial alpha to opaque. A pixel is interior if it cannot be
// reached from the image border by walking only through near-transparent pixels —
// i.e. it is enclosed by art. Genuine holes stay holes because they ARE reachable
// only if open, and a真 hole is fully transparent throughout, so the walk crosses it.
export async function repair(src, dst) {
  const { data, info } = await sharp(src).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const A = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) A[i] = data[i * 4 + 3];
  const reach = new Uint8Array(W * H); const q = [];
  const OPEN = 90; // walk through anything this transparent or more
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if ((x === 0 || y === 0 || x === W - 1 || y === H - 1) && A[i] < OPEN) { reach[i] = 1; q.push(i); }
  }
  for (let qi = 0; qi < q.length; qi++) {
    const i = q[qi], x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const ni = ny * W + nx;
      if (!reach[ni] && A[ni] < OPEN) { reach[ni] = 1; q.push(ni); }
    }
  }
  let fixed = 0;
  for (let i = 0; i < W * H; i++) {
    if (A[i] >= 250 || A[i] === 0) continue;
    if (reach[i]) continue;              // touches the outside: a real edge or hole
    data[i * 4 + 3] = 255; fixed++;      // enclosed by art: restore it
  }
  await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toFile(dst);
  return fixed;
}
