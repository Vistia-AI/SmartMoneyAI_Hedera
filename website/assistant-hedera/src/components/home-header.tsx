"use client";

// app/components/HomeHeader.tsx (Next.js Server Component)
// import { Menu, X } from "lucide-react";
import { Button } from "./ui/button";
import Link from "next/link";
import Image from "next/image";
import { HashPackConnect } from "@/components/hashpack-connect";
import { useHashConnect } from "@/context/HashConnectContext";
import { HashConnectConnectionState } from "hashconnect";
import { useEffect } from "react";

export function HomeHeader() {
  const { connectionState, pairingData } = useHashConnect();

  // Check if HashPack wallet is connected
  const isHashPackConnected =
    connectionState === HashConnectConnectionState.Paired;

  // Debug logging
  useEffect(() => {
    console.log("🏠 HomeHeader: Connection state changed", {
      connectionState,
      pairingData,
      isHashPackConnected,
    });
  }, [connectionState, pairingData, isHashPackConnected]);

  const navItems = [
    { name: "Home", path: "#home" },
    { name: "Features", path: "#features" },
    { name: "Agents", path: "/agents" },
    { name: "Pricing", path: "#pricing" },
    { name: "Contact", path: "#contact" },
    { name: "Contribute", path: "#opensource" },
    { name: "Docs", path: "" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-14 items-center justify-between px-4 relative">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/assets/icon.svg"
            alt="AI Agent Logo"
            className="h-6 w-6"
            width={1024}
            height={1024}
          />
          <span className="text-white">Vistia AI Agents</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center absolute left-1/2 -translate-x-1/2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-6"
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Right side buttons */}
        <div className="flex items-center gap-4">
          <HashPackConnect />
          {isHashPackConnected && (
            <Link href="/app/chat/default">
              <Button
                style={{ backgroundColor: "#7f00ff", color: "white" }}
                className="hover:bg-[#7f00ff]/90"
              >
                Launch App
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
