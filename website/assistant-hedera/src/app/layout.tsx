import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/providers";
import "./globals.css";

// Add safety check to prevent MetaMask injection
if (typeof window !== "undefined" && (window as any).ethereum) {
  console.warn(
    "MetaMask detected but not supported. This application uses Hedera HashPack wallet."
  );
  // Don't use window.ethereum - we only support HashPack
}

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
