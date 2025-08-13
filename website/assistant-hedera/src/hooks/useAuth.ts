'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { HashConnectConnectionState } from 'hashconnect';
import {
  autoAuthenticateAddress,
  checkAddressHasSession,
  checkAuth,
  signOut as serverSignOut,
  verifySignature,
} from '@/app/actions/auth';
import { useHashConnect } from '@/context/HashConnectContext';

export function useAuth() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authenticatedAddress, setAuthenticatedAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);

  const { connectionState, pairingData, autoConnect, manager } = useHashConnect();

  // Check HashPack connection status and auto-connect if needed
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const connected = connectionState === HashConnectConnectionState.Paired;
        setIsConnected(connected);
        setIsConnecting(connectionState === HashConnectConnectionState.Connecting);
        
        if (connected && pairingData && pairingData.accountIds.length > 0) {
          setCurrentAddress(pairingData.accountIds[0]);
        } else {
          setCurrentAddress(null);
          
          // If not connected but we have authentication, try to auto-connect
          if (isAuthenticated && !isConnecting && !isAutoConnecting) {
            console.log("User is authenticated but HashPack not connected, attempting auto-connect...");
            setIsAutoConnecting(true);
            try {
              await autoConnect();
            } catch (error) {
              console.error("Auto-connect failed:", error);
            } finally {
              setIsAutoConnecting(false);
            }
          }
        }
      } catch (error) {
        setIsConnected(false);
        setIsConnecting(false);
        setCurrentAddress(null);
      }
    };

    // Check immediately
    checkConnection();

    // Check every 5 minutes
    const interval = setInterval(checkConnection, 300000);

    return () => clearInterval(interval);
  }, [connectionState, pairingData, isAuthenticated, isConnecting, isAutoConnecting, autoConnect]);

  useEffect(() => {
    const verifyAuth = async () => {
      if (!isConnected || !currentAddress) {
        setIsAuthenticated(false);
        setAuthenticatedAddress(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const authData = await checkAuth();

        if (authData) {
          setIsAuthenticated(true);
          setAuthenticatedAddress(authData.address);

          if (currentAddress && authData.address !== currentAddress) {
            const hasSession = await checkAddressHasSession(currentAddress);

            if (hasSession) {
              const result = await autoAuthenticateAddress(currentAddress);

              if (result.success) {
                setIsAuthenticated(true);
                setAuthenticatedAddress(currentAddress);
                toast.success('Automatically signed in with connected wallet');
              } else {
                setIsAuthenticated(false);
                toast.info('Wallet address changed. Please sign in again.');
              }
            } else {
              setIsAuthenticated(false);
              toast.info('Wallet address changed. Please sign in again.');
            }
          }
        } else {
          if (currentAddress) {
            const hasSession = await checkAddressHasSession(currentAddress);

            if (hasSession) {
              const result = await autoAuthenticateAddress(currentAddress);

              if (result.success) {
                setIsAuthenticated(true);
                setAuthenticatedAddress(currentAddress);
                toast.success('Automatically signed in with connected wallet');
              } else {
                setIsAuthenticated(false);
                setAuthenticatedAddress(null);
              }
            } else {
              setIsAuthenticated(false);
              setAuthenticatedAddress(null);
            }
          }
        }
      } catch {
        console.log("verify authenticate error");
        setIsAuthenticated(false);
        setAuthenticatedAddress(null);
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuth();
  }, [isConnected, currentAddress]);

  const signIn = async (toasting: boolean = true) => {
    if (!currentAddress) {
      return;
    }

    try {
      setIsLoading(true);

      // Simple message for the user to sign
      const message = `Sign this message to login to the app.\n\nAddress:\n${currentAddress}\nTimestamp:\n${new Date().toISOString()}`;

      // User signs this simple message using HashPack
      const signatureResult = await manager.signMessage(currentAddress, message);
      
      // HashPack returns an array of signatures, we need the first one
      const signatureObj = Array.isArray(signatureResult) ? signatureResult[0] : signatureResult;
      
      // Extract the signature and convert Uint8Array to base64 string
      const signatureBytes = typeof signatureObj === 'string' ? 
        new TextEncoder().encode(signatureObj) : 
        signatureObj.signature;
      
      const signature = Buffer.from(signatureBytes).toString('base64');

      // Send to server for verification
      await verifySignature(message, signature);

      setIsAuthenticated(true);
      setAuthenticatedAddress(currentAddress);
      if (toasting) toast.success('Successfully signed in');
    } catch {
      console.log("sign in error");
      setIsAuthenticated(false);
      setAuthenticatedAddress(null);
      if (toasting) toast.error('Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async (toasting: boolean = true) => {
    try {
      await serverSignOut();
    } catch {
      console.log("sign out error")
      // Error handling is silent
    }

    setIsAuthenticated(false);
    setAuthenticatedAddress(null);
    if (toasting) toast.success('Signed out successfully');
  };

  return {
    isConnected,
    isConnecting,
    currentAddress,
    isAuthenticated,
    authenticatedAddress,
    isLoading,
    isAutoConnecting,
    signIn,
    signOut,
  };
}
