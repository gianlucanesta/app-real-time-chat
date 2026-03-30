import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArchiveSidebar } from "../components/chat/ArchiveSidebar";
import { ChatArea } from "../components/chat/ChatArea";
import { useChat } from "../contexts/ChatContext";

export const Route = createFileRoute("/_authenticated/archive")({
  component: ArchivePage,
});

function ArchivePage() {
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const { activeConversation, setActiveConversation, setMobileInChat } =
    useChat();

  useEffect(() => {
    if (activeConversation) setMobileShowChat(true);
  }, [activeConversation]);

  useEffect(() => {
    setMobileInChat(mobileShowChat);
    return () => setMobileInChat(false);
  }, [mobileShowChat, setMobileInChat]);

  return (
    <div className="h-full flex overflow-hidden font-sans bg-bg text-text-main">
      <div
        className={`${mobileShowChat ? "hidden" : "flex"} md:flex w-full md:w-auto`}
      >
        <ArchiveSidebar
          onSelectChat={(conv) => {
            setActiveConversation(conv.id);
          }}
        />
      </div>
      <div
        className={`${mobileShowChat ? "flex" : "hidden"} md:flex flex-1 min-w-0 h-full overflow-hidden`}
      >
        <ChatArea
          onMobileBack={() => {
            setMobileShowChat(false);
            setActiveConversation(null);
          }}
        />
      </div>
    </div>
  );
}
