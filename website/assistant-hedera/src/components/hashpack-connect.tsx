"use client";

import { Button } from "@/components/ui/button";
import { Wallet, LogOut, Loader2 } from "lucide-react";
import { useHashConnect } from "@/context/HashConnectContext";
import { useAuth } from "@/hooks/useAuth";
import { HashConnectConnectionState } from "hashconnect";

/**
 * HashPack Connect Component
 *
 * A UI component that handles HashPack wallet connection and displays connection status.
 * Provides buttons for connecting, disconnecting, and shows account information when connected.
 *
 * Features:
 * - Connect button for manual wallet connection
 * - Disconnect button to remove wallet connection
 * - Loading states during connection attempts
 * - Account ID display when connected
 * - Integration with authentication system
 *
 * Example usage in other components:
 * ```tsx
 * import { useHashConnect } from "@/context/HashConnectContext";
 *
 * function SomeComponent() {
 *   const { manager, connectionState, pairingData } = useHashConnect();
 *
 *   const handleTransaction = async () => {
 *     if (connectionState === HashConnectConnectionState.Paired && pairingData) {
 *       const accountId = pairingData.accountIds[0];
 *       const signer = manager.getSigner(accountId);
 *       // Use signer for transactions...
 *     }
 *   };
 *
 *   return <button onClick={handleTransaction}>Send Transaction</button>;
 * }
 * ```
 */
export function HashPackConnect() {
  const {
    connectionState,
    pairingData,
    isConnecting,
    isAutoConnecting,
    connect,
    disconnect,
  } = useHashConnect();
  const { signOut } = useAuth();

  /**
   * Handles manual wallet connection
   * Opens HashPack pairing modal for user to connect
   */
  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error("Failed to connect:", error);
    }
  };

  /**
   * Handles wallet disconnection
   * Disconnects from HashPack and removes user session
   */
  const handleDisconnect = async () => {
    try {
      // Disconnect from HashPack
      disconnect();

      // Also sign out to remove the session
      await signOut(false); // Don't show toast for disconnect
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
  };

  // Connection state checks
  const isPaired = connectionState === HashConnectConnectionState.Paired;
  const isConnected = connectionState === HashConnectConnectionState.Connected;
  const isLoading =
    isConnecting ||
    isAutoConnecting ||
    connectionState === HashConnectConnectionState.Connecting;

  // Show account info when paired with wallet
  if (isPaired && pairingData) {
    const accountId = pairingData.accountIds[0];

    return (
      <div className="flex items-center gap-2">
        {/* Connected account display */}
        <Button
          variant="outline"
          size="sm"
          className="text-green-500 border-green-500/50"
        >
          <Wallet className="h-4 w-4 mr-2" />
          {accountId}
        </Button>
        {/* Disconnect button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDisconnect}
          className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Show loading state during connection attempts
  if (isLoading) {
    const loadingText = isAutoConnecting
      ? "Auto-connecting..."
      : "Connecting...";
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        {loadingText}
      </Button>
    );
  }

  // Show connect button when not connected
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleConnect}
      className="hover:bg-brand-primary/10 hover:border-brand-primary/50 hover:text-brand-primary"
    >
      <Wallet className="h-4 w-4 mr-2" />
      Connect HashPack
    </Button>
  );
}
