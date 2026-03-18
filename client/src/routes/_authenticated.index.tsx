import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Sidebar } from "../components/chat/Sidebar";
import { ChatArea } from "../components/chat/ChatArea";
import { NewChatModal } from "../components/chat/NewChatModal";

export const Route = createFileRoute("/_authenticated/")({
  component: ChatIndex,
});

function ChatIndex() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="h-screen max-h-screen flex overflow-hidden font-sans bg-bg text-text-main">
      <Sidebar onOpenNewChat={() => setIsModalOpen(true)} />
      <ChatArea />
      <NewChatModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
