import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Festive Frames Designer",
  description: "Design your custom license plate frame with decorative snap-on tiles",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
