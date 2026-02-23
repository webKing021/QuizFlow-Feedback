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
  title: "QuizFlow — Share Your Feedback | LJ College of Computer Application",
  description:
    "Help us build QuizFlow 2.0! Share your feedback about the QuizFlow Quiz Management System used at LJ College of Computer Application, Vastrapur, Ahmedabad.",
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
