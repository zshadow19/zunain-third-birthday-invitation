import type { Metadata, Viewport } from "next";
import "./globals.css";
const siteOrigin = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin), title: "Zunain is turning 3 — Let’s roar it up!",
  description: "A wild little celebration for Zunain’s third birthday. Join us on 21 November 2026 at 6:30 PM, Lakeshore Heights, Gulshan 1, Dhaka.",
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "en_US", url: "/", siteName: "Zunain’s Third Birthday",
    title: "A little roar. A big celebration. Zunain is turning 3!", description: "You’re invited! 21 November 2026 · 6:30 PM · Lakeshore Heights, Dhaka.",
    images: [{ url: "/social-preview.jpg", width: 1200, height: 630, alt: "Zunain’s third birthday — original dinosaur invitation artwork with party details" }],
  },
  twitter: { card: "summary_large_image", title: "Zunain is turning 3 — Let’s roar it up!", description: "21 November 2026 · 6:30 PM · Lakeshore Heights, Dhaka.", images: ["/social-preview.jpg"] },
  icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f6f4ec" };
export default function RootLayout({ children }: LayoutProps<"/">) { return <html lang="en"><body>{children}</body></html>; }
