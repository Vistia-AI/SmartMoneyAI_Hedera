"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/ui/chat/chat-input";
import { Send } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
// import { ChatFileInput } from "@/components/ui/chat/chat-file-input";  // for attachments, commented out for now
import { ChatProps } from "@/types/chat";

import { useChat } from "@ai-sdk/react";
import { createIdGenerator, Message } from "ai";
import { ChatMessageList } from "@/components/ui/chat/chat-message-list";
import { useHashConnect } from "@/context/HashConnectContext";
import { signTxnWithHashPack, type SignResponse } from "@/lib/sign-txn";

// Add safety check to prevent MetaMask injection
if (typeof window !== "undefined" && (window as any).ethereum) {
  console.warn(
    "MetaMask detected but not supported. This application uses Hedera HashPack wallet."
  );
  // Don't use window.ethereum - we only support HashPack
}

export function Chat({ userId, initialMessages, isAuthenticated }: ChatProps) {
  //   const [selectedFile, setSelectedFile] = useState<File | null>(null);  // for attachments, commented out for now
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [visibleMessagesCount] = useState(30);
  const { pairingData, manager } = useHashConnect();
  const disconnect = () => {}; // Placeholder function
  const [, setShowModal] = useState(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const {
    messages,
    setMessages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
  } = useChat({
    id: userId,
    initialMessages,
    generateId: createIdGenerator({
      prefix: "user",
      size: 32,
    }),
    sendExtraMessageFields: true,
    body: {
      chainId: 295, // Hedera mainnet chain ID
    }, // note: we need this, don't be stupid
    onResponse: async (res) => {
      if (res.status === 401) disconnect();
    },
    onFinish: async (res) => {
      try {
        // Check for prep data
        const prepToolsInvocated = res.parts?.filter(
          (part) =>
            part.type === "tool-invocation" &&
            part.toolInvocation.toolName === "prep"
        );

        // Run transaction signing with current wallet (currently placeholder for Hedera)
        if (prepToolsInvocated?.length) {
          const prepedDataType = prepToolsInvocated[0].type;
          const prepedData =
            prepedDataType === "tool-invocation"
              ? prepToolsInvocated[0].toolInvocation
              : null;
          if (prepedData?.state === "result") {
            setShowModal(true);
            const swapData = prepedData.result.preparedData;
            const {
              fromTokenAddress,
              toTokenAddress,
              fromToken,
              toToken,
              amountIn,
              estimatedAmountOutMin: amountOutMin,
            } = swapData;

            // Check if HashPack is connected
            if (!pairingData || !manager) {
              console.error("HashPack not connected");
              setShowModal(false);
              return;
            }

            try {
              const signResult: SignResponse = await signTxnWithHashPack({
                pairingData,
                manager,
                preparedData: {
                  fromTokenAddress: fromTokenAddress as `0x${string}`,
                  toTokenAddress: toTokenAddress as `0x${string}`,
                  fromToken,
                  toToken,
                  amountIn,
                  estimatedAmountOutMin: amountOutMin,
                },
              });
            } catch (error) {
              console.error("[Chat] Error during transaction signing:", error);
            } finally {
              setShowModal(false);
            }
          }
        }
      } catch (error) {
        setShowModal(false);
        console.log(
          "Unexpected error: ",
          error instanceof Error ? error.message : error
        );
      }
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages.length, scrollToBottom]);

  // const loadMoreMessages = useCallback(() => {
  //   setVisibleMessagesCount((prev) => prev + 2);
  // }, []);

  // const isWaitingForResponse = useCallback(() => {
  //   if (!messages.length) return false;
  //   const lastMessage = messages[messages.length - 1];

  //   // If the last message is from the user, we're waiting for a response
  //   if (lastMessage.role === "user") {
  //     return true;
  //   }

  //   // For assistant messages, we're waiting if:
  //   // 1. There's no content yet, regardless of tool invocation state
  //   if (lastMessage.role === "assistant") {
  //     const hasContent = !!lastMessage.content;
  //     const hasToolInvocationContent = lastMessage.toolInvocations?.some(
  //       (tool) =>
  //         tool.state === "result" &&
  //         tool.result &&
  //         (("content" in tool.result && !!tool.result.content) ||
  //           ("message" in tool.result && !!tool.result.message))
  //     );

  //     // Show typing indicator as long as there's no content yet and no tool invocation content
  //     return !hasContent && !hasToolInvocationContent;
  //   }

  //   return false;
  // }, [messages]);

  // Updates stream
  useEffect(() => {
    let eventSource: EventSource;

    const connectSSE = () => {
      console.log("Connecting to SSE...");
      eventSource = new EventSource("/api/updates");

      eventSource.onopen = () => {
        console.log("SSE connection opened");
      };

      eventSource.onmessage = (event) => {
        console.log("SSE message received:", event.data);
        const data = JSON.parse(event.data);
        if (data.messages) {
          setMessages((prevMessages) => {
            const [newMessage] = data.messages;

            // Handle streaming updates
            if (newMessage.streaming) {
              const existingIndex = prevMessages.findIndex(
                (msg) => msg.id === newMessage.id
              );

              if (existingIndex !== -1) {
                // Update existing message
                const updatedMessages = [...prevMessages];
                updatedMessages[existingIndex] = {
                  ...updatedMessages[existingIndex],
                  ...newMessage,
                  // Preserve any existing tool invocations
                  toolInvocations:
                    updatedMessages[existingIndex].toolInvocations,
                };
                return updatedMessages;
              } else {
                // Add as new message
                return [...prevMessages, newMessage];
              }
            }

            // For non-streaming messages (e.g., tool results)
            return [...prevMessages, ...data.messages];
          });
        }
      };

      eventSource.onerror = (error) => {
        console.error("SSE error:", error);
        eventSource.close();
        setTimeout(connectSSE, 1000);
      };
    };

    connectSSE();

    return () => {
      console.log("Cleaning up SSE connection...");
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [setMessages]);

  const uniqueMessages = useMemo(
    () =>
      messages
        .reduce((unique: Message[], message, index) => {
          const lastIndex = messages.findLastIndex((m) => m.id === message.id);
          if (index === lastIndex) {
            unique.push(message);
          }
          return unique;
        }, [])
        .slice(-visibleMessagesCount),
    [messages, visibleMessagesCount]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (e.nativeEvent.isComposing) return;
      handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col w-full h-[calc(100vh-115px)]">
        {/* Messages container */}
        <div className="flex-1 overflow-y-auto pb-[140px] w-full scrollbar scrollbar-w-2 scrollbar-thumb-[#27272A] scrollbar-track-transparent hover:scrollbar-thumb-[#3f3f46]">
          <div className="w-full max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
            <ChatMessageList messages={uniqueMessages} isLoading={isLoading} />
          </div>
          <div ref={messagesEndRef} />
        </div>

        {/* Input form */}
        <div className="fixed bottom-0 left-0 right-0 border-t border-[#27272A] bg-[#121212]/80 backdrop-blur-sm z-10 pb-6">
          <div className="max-w-3xl mx-auto p-4">
            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
              <div className="flex items-end gap-2">
                <div className="flex-1 relative rounded-md border bg-card">
                  <ChatInput
                    ref={inputRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      isLoading ? "Loading..." : "Type your message here..."
                    }
                    className="min-h-12 resize-none rounded-md bg-[#1a1a1a] border-[#27272A] focus:border-[#7f00ff] focus:ring-[#7f00ff] p-3 shadow-none focus-visible:ring-0"
                    disabled={isLoading || !isAuthenticated}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={!input.trim() || isLoading || !isAuthenticated}
                    className="h-12 gap-1.5 bg-[#7f00ff] text-white hover:bg-[#7f00ff]/90"
                  >
                    Send
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
