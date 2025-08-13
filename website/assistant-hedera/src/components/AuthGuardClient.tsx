"use client";

import { ReactNode, useEffect, useState } from "react";
import { Brain, Shuffle, TrendUp } from "@phosphor-icons/react";
//import { ArrowRight, Bot, Construction, Network, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AuthPageProps } from "@/types/chat";
import { HashConnectConnectionState } from "hashconnect";
import { HashPackConnect } from "@/components/hashpack-connect";
import { useAuth } from "@/hooks/useAuth";
import { useHashConnect } from "@/context/HashConnectContext";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
}
function SignatureLoadingOverlay() {
  return (
    <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
      <Card className="max-w-md bg-[#121212] border-[#27272A] p-6">
        <div className="flex flex-col items-center text-center">
          <h3 className="text-xl font-semibold text-[#7f00ff]">
            Waiting for signature
          </h3>
          <p className="mt-2 text-muted-foreground">
            Please check your wallet and sign the message to verify your
            identity. This won&apos;t cost any gas fees or initiate
            transactions.
          </p>
          <div className="mt-6">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#7f00ff]"></div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function AuthPage({ isConnectStep, error, signIn, setError }: AuthPageProps) {
  return (
    <div className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-col items-center justify-start bg-background p-6 pt-12">
      <div className="w-full max-w-6xl">
        {/* Welcome section */}

        <div className="mb-16 text-center">
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight title-gradient sm:text-4xl md:text-4xl">
            Vistia AI Trading Assistant
          </h1>

          <p className="text-xl text-muted-foreground">
            Welcome! Connect your wallet to proceed
          </p>
        </div>
        {/* Feature Highlight */}
        <div className="mb-12 grid gap-8 sm:grid-cols-2 md:grid-cols-3">
          <FeatureCard
            icon={<Brain className="h-10 w-10 text-[#7f00ff]" />}
            title="Market Analysis"
            description="Swap tokens, bridge assets, and set limit orders with our intelligent assistant"
          />
          <FeatureCardOne
            icon={<TrendUp className="h-8 w-8 text-[#7f00ff]" />}
            title="Smart Trading"
            description="Execute trades, set limit orders, and deploy strategies using natural language"
          />
          <FeatureCardTwo
            icon={<Shuffle className="h-8 w-8 text-[#7f00ff]" />}
            title="Cross-Chain Operations"
            description="Seamlessly bridge assets between Pocket Network and other blockchains"
          />
        </div>

        {/* Action section */}
        <div className="flex flex-col items-center text-xl text-muted-foreground">
          <h2 className="mb-6 text-2xl font-semibold text-[#7f00ff]">
            Connect Wallet to Start Trading
          </h2>
          {error && (
            <p className="mb-4 text-center text-destructive">{error}</p>
          )}
          <HashPackConnect />
        </div>
      </div>
    </div>
  );
}

export function AuthGuardClient({
  children,
  initialAuth = false,
}: {
  children: React.ReactNode;
  initialAuth?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasCompletedAuth, setHasCompletedAuth] = useState(initialAuth);

  const { isConnected, isAuthenticated, signIn, isLoading, isAutoConnecting } =
    useAuth();
  const { connectionState, pairingData, autoConnect } = useHashConnect();

  useEffect(() => {
    // Auto-connect HashPack if there's an existing session
    const performAutoConnect = async () => {
      if (initialAuth && typeof window !== "undefined") {
        try {
          console.log("Auto-connecting HashPack due to existing session...");
          await autoConnect();
        } catch (error) {
          console.error("Failed to auto-connect HashPack:", error);
        }
      }
    };

    performAutoConnect();

    // Only set initializing to false when we've determined the initial auth state
    // Add a small delay to prevent flashing states
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [initialAuth, autoConnect]);

  // Track when authentication is fully completed
  useEffect(() => {
    // Check if HashPack is connected and authenticated
    const checkHashPackAuth = async () => {
      try {
        // If HashPack is paired but not authenticated, only trigger sign-in if:
        // 1. We don't have initial auth (meaning no existing session)
        // 2. User explicitly connected (not auto-connect)
        // 3. Not currently auto-connecting
        if (
          connectionState === HashConnectConnectionState.Paired &&
          pairingData &&
          pairingData.accountIds.length > 0 &&
          !isAuthenticated &&
          !isLoading &&
          !initialAuth && // Don't auto-sign-in if we have an existing session
          !isAutoConnecting // Don't sign-in during auto-connect process
        ) {
          console.log(
            "HashPack connected but not authenticated, triggering sign-in..."
          );
          await signIn();
        }

        // Allow access if authenticated OR if we have initial auth
        if (isAuthenticated || initialAuth) {
          setHasCompletedAuth(true);
        } else {
          setHasCompletedAuth(false);
        }
      } catch (error) {
        console.error("Error checking HashPack auth:", error);
        // If HashConnect is not available, fall back to initial auth
        setHasCompletedAuth(initialAuth);
      }
    };

    // Only check on client side
    if (typeof window !== "undefined") {
      checkHashPackAuth();

      // Check every 5 seconds instead of 2 to reduce frequency
      const interval = setInterval(checkHashPackAuth, 5000);

      return () => clearInterval(interval);
    } else {
      // During SSR, use initial auth state
      setHasCompletedAuth(initialAuth);
    }
  }, [
    initialAuth,
    isConnected,
    isAuthenticated,
    isLoading,
    signIn,
    connectionState,
    pairingData,
    isAutoConnecting,
  ]);

  // Show nothing during initial load to prevent flashing
  if (isInitializing) {
    return null;
  }

  // Show loading state during authentication (but not during auto-connect)
  if (isLoading && !isAutoConnecting) {
    return <SignatureLoadingOverlay />;
  }

  // Show auth page if not authenticated
  if (!hasCompletedAuth) {
    return (
      <AuthPage
        isConnectStep={true}
        error={error}
        signIn={signIn}
        setError={setError}
      />
    );
  }

  // Show children if authenticated
  return <>{children}</>;
}
// Helper Components
function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="flex flex-col items-center rounded-xl border-[#27272A] bg-[#121212] p-6 text-center backdrop-blur-sm transition-all hover:border-[#7f00ff]/50 hover:bg-[#1a1a1a]">
      <div className="mb-4">{icon}</div>
      <h3 className="mb-2 text-xl font-semibold text-[#7f00ff]">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
function FeatureCardOne({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="flex flex-col items-center rounded-xl border-[#27272A] bg-[#121212] p-6 text-center backdrop-blur-sm transition-all hover:border-[#7f00ff]/50 hover:bg-[#1a1a1a]">
      <div className="mb-4">{icon}</div>
      <h3 className="mb-2 text-xl font-semibold text-[#7f00ff]">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
function FeatureCardTwo({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="flex flex-col items-center rounded-xl border-[#27272A] bg-[#121212] p-6 text-center backdrop-blur-sm transition-all hover:border-[#7f00ff]/50 hover:bg-[#1a1a1a]">
      <div className="mb-4">{icon}</div>
      <h3 className="mb-2 text-xl font-semibold text-[#7f00ff]">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
