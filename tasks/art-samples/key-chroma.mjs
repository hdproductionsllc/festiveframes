import { loadImage, createCanvas } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";
const D = "tasks/art-samples";
const JOBS = [
  ["high-level-description-a-3d-product-rend_MkW2AY7aXWKoNFWZUzzKNQ_HdKdeishSF2N9p1tzowamQ.png","soccer-patch"],
  ["high-level-description-a-3d-render-of-a-_G2Pf_0txVG6eud94EctQhA_2akg-qKqSJGLMnAkKg0IDQ.png","football-patch"],
  ["high-level-description-a-3d-render-of-a-_PLyCmKDJUbaJ1Rppxpb7wg_vV4fg-1uTk-WQYYt2mgu7g.png","basketball-patch"],
  ["high-level-description-a-photorealistic-_2jNHO8pCVGmhHdGkeJ153A_LHfEosGJRcK9wHz7imYwYg_cover.png","volleyball-patch"],
  ["high-level-description-a-photorealistic-_4xkiDrCDV2-5LXFfgrBhaw_yf0SZCLFRWuN1301e-OxOw.png","softball-patch"],
  ["high-level-description-a-photorealistic-_tvqVy84wUImms5_YDqw-AA_qN9NpgnoQReUExmfnGZE_w.png","baseball-patch"],
];
// Chroma distance in the (r-g, b-g) plane: independent of BRIGHTNESS, so a lighting
// gradient across the backdrop moves a pixel very little while the art moves a lot.
const chroma = (r,g,b) => [r-g, b-g];
const dist = (a,b) => Math.hypot(a[0]-b[0], a[1]-b[1]);

for (const [src, out] of JOBS) {
  const im = await loadImage(`${D}/${src}`);
  const W = im.width, H = im.height;
  const c = createCanvas(W,H), g = c.getContext("2d");
  g.drawImage(im,0,0);
  const img = g.getImageData(0,0,W,H), d = img.data;
  // Background reference = median of a border ring, so one stray pixel cannot skew it.
  const samples = [];
  for (let i=0;i<W;i+=7){ for (const y of [2,3,H-3,H-4]) { const k=(y*W+i)*4; samples.push([d[k],d[k+1],d[k+2]]); } }
  for (let y=0;y<H;y+=7){ for (const x of [2,3,W-3,W-4]) { const k=(y*W+x)*4; samples.push([d[k],d[k+1],d[k+2]]); } }
  const med = k => { const v=samples.map(s=>s[k]).sort((a,b)=>a-b); return v[v.length>>1]; };
  const BG = [med(0),med(1),med(2)];
  const bgC = chroma(...BG);
  // Thresholds in chroma units. Below T0 it is background; above T1 it is art; between
  // is the antialiased edge, where alpha ramps and the matte gets subtracted.
  const T0 = 48, T1 = 92;
  let cut=0, edge=0;
  for (let i=0;i<d.length;i+=4){
    const dc = dist(chroma(d[i],d[i+1],d[i+2]), bgC);
    let a = (dc - T0) / (T1 - T0);
    a = a<0?0:a>1?1:a;
    // A soft CAST SHADOW is the backdrop hue at lower brightness, so it lands just
    // above T0 and survives as a coloured smudge under the object. Any barely-there
    // pixel that is still chromatically near the backdrop is shadow, not art edge —
    // real art edges leave the backdrop's chroma fast because the art is a different
    // colour, not a darker version of the same one.
    if (a < 0.7 && dc < T0 * 1.9) a = 0;
    if (a === 0) { d[i+3]=0; cut++; continue; }
    if (a < 1) {
      edge++;
      // UN-MULTIPLY the known background out of the partial pixel. This is the step
      // that removes the halo: the edge pixel is art*a + bg*(1-a), so recovering art
      // needs the bg value, and here we measured it rather than guessed.
      for (let k=0;k<3;k++){
        const v = (d[i+k] - (1-a)*BG[k]) / a;
        d[i+k] = v<0?0:v>255?255:v;
      }
    }
    d[i+3] = Math.round(a*255);
  }
  g.putImageData(img,0,0);

  // TRIM to the art's own alpha bounding box, then re-pad to a square.
  //
  // The generator leaves a generous margin, and the badge then reserves another ~15%
  // of a cell for rim + bevel + air (chromeInset), so an untrimmed file lands as a
  // small ball floating in a large tile. Cropping to what is actually painted lets
  // `objectFit: contain` scale the art up to the tile instead of scaling the
  // generator's whitespace.
  //
  // Re-padded to a SQUARE around the art's centre rather than saved as a bare bbox:
  // a tile is square, and a non-square source would otherwise be letterboxed by
  // contain — trading the margin we just removed for a different one.
  // Bounding box by ROW/COLUMN OCCUPANCY, not by any single pixel.
  //
  // A per-pixel test is defeated by one stray survivor: two of these files keep a few
  // solid pixels right at the frame edge, and a single one pins the box to the whole
  // canvas so the trim silently does nothing. Requiring a row or column to carry a
  // MEANINGFUL number of solid pixels before it counts as "art" ignores specks while
  // still finding the true extent of the ball.
  const MIN_RUN = Math.max(4, Math.round(W * 0.004));
  const rowN = new Array(H).fill(0), colN = new Array(W).fill(0);
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
    if (d[((y*W+x)<<2)+3] > 96) { rowN[y]++; colN[x]++; }
  }
  const first = (arr) => arr.findIndex(v => v >= MIN_RUN);
  const last = (arr) => { for (let i=arr.length-1;i>=0;i--) if (arr[i] >= MIN_RUN) return i; return -1; };
  const y0 = first(rowN), y1 = last(rowN), x0 = first(colN), x1 = last(colN);
  if (x1 >= x0 && y1 >= y0) {
    const bw = x1-x0+1, bh = y1-y0+1;
    const side = Math.max(bw, bh);
    const t = createCanvas(side, side), tg = t.getContext("2d");
    tg.drawImage(c, x0, y0, bw, bh, (side-bw)/2, (side-bh)/2, bw, bh);
    writeFileSync(`public/tiles/high-school/${out}.png`, t.toBuffer("image/png"));
    console.log(`${out.padEnd(18)} bg=rgb(${BG})  trimmed ${W}x${H} -> ${side}x${side}  (art filled ${(100*Math.max(bw,bh)/W).toFixed(0)}% before)`);
    continue;
  }
  writeFileSync(`public/tiles/high-school/${out}.png`, c.toBuffer("image/png"));

}
