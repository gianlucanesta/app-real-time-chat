import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Sidebar } from "../components/chat/Sidebar";
import { ChatArea } from "../components/chat/ChatArea";
import { NewChatModal } from "../components/chat/NewChatModal";
import { useChat } from "../contexts/ChatContext";

export const Route = createFileRoute("/_authenticated/")({
  component: ChatIndex,
});

function ChatIndex() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const { activeConversation } = useChat();

  // When a conversation is selected, show chat on mobile
  useEffect(() => {
    if (activeConversation) setMobileShowChat(true);
  }, [activeConversation]);

  return (
    <div className="h-screen max-h-screen flex overflow-hidden font-sans bg-bg text-text-main">
      <div
        className={`${mobileShowChat ? "hidden" : "flex"} md:flex w-full md:w-auto`}
      >
        <Sidebar onOpenNewChat={() => setIsModalOpen(true)} />
      </div>
      <div
        className={`${mobileShowChat ? "flex" : "hidden"} md:flex flex-1 min-w-0`}
      >
        <ChatArea onMobileBack={() => setMobileShowChat(false)} />
      </div>
      <NewChatModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
