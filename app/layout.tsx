import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BrainFuel AI — Smart Notes. Smarter Prep. | LJ Innovation Village 2026",
  description:
    "Live feedback for BrainFuel AI project presentation at LJ Innovation Village 2026. Rate and review our AI-powered educational platform.",
  icons: {
    icon: [{ url: "/icon.ico?v=3", type: "image/x-icon" }],
    shortcut: [{ url: "/icon.ico?v=3", type: "image/x-icon" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
