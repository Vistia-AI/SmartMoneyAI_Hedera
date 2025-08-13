"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashConnectProvider } from "@/context/HashConnectContext";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <HashConnectProvider>{children}</HashConnectProvider>
    </QueryClientProvider>
  );
}
