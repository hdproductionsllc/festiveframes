import { loadImage, createCanvas } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";
const D = "tasks/art-samples";
const JOBS = [
  ["high-level-description-a-3d-product-rend_MkW2AY7aXWKoNFWZUzzKNQ_HdKdeishSF2N9p1tzowamQ.png","soccer-patch"],
  ["high-level-description-a-3d-render-of-a-_G2Pf_0txVG6eud94EctQhA_2akg-qKqSJGLMnAkKg0IDQ.png","football-patch"],
  ["high-level-description-a-3d-render-of-a-_PLyCmKDJUbaJ1Rppxpb7wg_vV4fg-1uTk-WQYYt2mgu7g.png","basketball-patch"],
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
  const T0 = 26, T1 = 74;
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
    if (a < 0.45 && dc < T0 * 2.1) a = 0;
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
  writeFileSync(`public/tiles/high-school/${out}.png`, c.toBuffer("image/png"));
  console.log(`${out.padEnd(18)} bg=rgb(${BG})  cut=${(100*cut/(W*H)).toFixed(1)}%  edge=${edge}px`);
}
