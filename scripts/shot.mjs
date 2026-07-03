import puppeteer from "puppeteer-core";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const OUT = process.argv[2] || "shot.png";
const URL = process.argv[3] || "http://localhost:3000/build";
const W = Number(process.argv[4] || 1440);
const H = Number(process.argv[5] || 1000);

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: "new",
  args: ["--no-sandbox", `--window-size=${W},${H}`],
  defaultViewport: { width: W, height: H },
});
const page = await browser.newPage();
await page.goto(URL, { waitUntil: "networkidle2", timeout: 60000 });

// Dismiss onboarding popups: "Let's start your frame" (START DESIGNING) and the
// "Welcome to the Builder" tour (Skip, I got this).
const clickByText = async (src) =>
  page.evaluate((s) => {
    const rx = new RegExp(s, "i");
    const btn = [...document.querySelectorAll("button")].find((b) => rx.test(b.textContent || ""));
    if (btn) { btn.click(); return true; }
    return false;
  }, src);

for (const src of ["start designing", "skip, i got this", "^skip"]) {
  try {
    await page.waitForFunction((s) => {
      const rx = new RegExp(s, "i");
      return [...document.querySelectorAll("button")].some((b) => rx.test(b.textContent || ""));
    }, { timeout: 5000 }, src);
    await clickByText(src);
    await new Promise((r) => setTimeout(r, 1200));
  } catch {
    // popup not present — continue
  }
}

if (process.argv[7] === "banner") {
  await clickByText("add a banner");
  await new Promise((r) => setTimeout(r, 800));
}
if (process.argv[7] === "save") {
  await clickByText("save design");
  await new Promise((r) => setTimeout(r, 900));
}
if (process.argv[7] === "secimg") {
  await clickByText("^image$"); // first Image toggle = Left panel
  await new Promise((r) => setTimeout(r, 700));
}
if (process.argv[7] === "sectext") {
  await clickByText("^text$"); // first Text toggle = Left panel
  await new Promise((r) => setTimeout(r, 500));
  await clickByText("class of"); // a multi-line school phrase chip
  await new Promise((r) => setTimeout(r, 400));
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 500));
}
const scrollY = Number(process.argv[6] || 0);
if (scrollY > 0) {
  await page.evaluate((y) => window.scrollTo(0, y), scrollY);
  await new Promise((r) => setTimeout(r, 500));
}
await new Promise((r) => setTimeout(r, 900));
await page.screenshot({ path: OUT });
console.log("shot ->", OUT);
await browser.close();
