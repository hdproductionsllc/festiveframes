import Link from "next/link";

// Branded 404. This is the root not-found boundary, so it is NOT wrapped in
// the (site) sticker chrome. It carries its own self-contained sticker theme
// (cream canvas, thick ink outlines, hard offset shadows, gold/pink accents)
// to match the redesigned storefront. Server Component.
export const metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#faf0d6] px-6 text-center text-[#1e1b17]">
      <span
        className="mb-6 inline-flex items-center gap-2 rounded-full border-[3px] border-[#1e1b17] bg-[#fff9ec] px-4 py-[7px] text-sm font-extrabold tracking-[0.3px] text-[#1e1b17] shadow-[3px_3px_0_#1e1b17]"
      >
        <span className="inline-block h-[11px] w-[11px] rounded-full bg-[#ed5aa0]" />
        Page not found
      </span>
      <h1 className="text-[clamp(64px,16vw,120px)] font-extrabold leading-[0.9] tracking-[-3px]">
        404
      </h1>
      <p className="mt-4 max-w-md text-lg font-bold text-[#3a352c]">
        We could not find that page. Take a different route.
      </p>
      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <Link
          href="/build"
          className="inline-flex items-center justify-center rounded-full border-[3px] border-[#1e1b17] bg-[#f8c53b] px-7 py-3 text-base font-extrabold text-[#1e1b17] shadow-[5px_5px_0_#1e1b17] transition-transform hover:-translate-x-[2px] hover:-translate-y-[2px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e1b17]"
        >
          Design your frame
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full border-[3px] border-[#1e1b17] bg-[#fff9ec] px-7 py-3 text-base font-extrabold text-[#1e1b17] shadow-[5px_5px_0_#1e1b17] transition-transform hover:-translate-x-[2px] hover:-translate-y-[2px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e1b17]"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
