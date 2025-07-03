import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/providers";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vistia - AI-Powered Trading Platform",
  description:
    "Analyze data, predict market trends, and execute trades automatically. Vistia optimizes profits, minimizes risks, and removes emotions from trading.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-background">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
