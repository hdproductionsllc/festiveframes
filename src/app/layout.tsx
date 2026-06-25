import type { Metadata } from "next";
import { Oswald, Libre_Franklin } from "next/font/google";
import { SITE_URL } from "@/config/season";
import "./globals.css";

// Marketing typography, self-hosted at build time via next/font (compliant).
// Display: Oswald — condensed mid-century American signage face for headings.
// Body: Libre Franklin — clean, highly readable body face.
// Exposed as CSS variables so the marketing (site) layout can opt in without
// affecting the dark builder, which keeps its own --font-display / --font-sans.
const displayFont = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-display-marketing",
});

const bodyFont = Libre_Franklin({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-body-marketing",
});

export const metadata: Metadata = {
  // Absolute base so file-convention images (opengraph-image) and any relative
  // metadata URLs resolve to fully-qualified canonical URLs.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Festive Frames",
    template: "%s | Festive Frames",
  },
  description:
    "Design your own custom license plate frame: pick a theme, snap on the tiles you want, and add your phrase. Made to order by hand in the USA, $39.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${displayFont.variable} ${bodyFont.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
