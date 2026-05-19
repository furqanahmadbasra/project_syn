"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Plus, Trash2, X } from "lucide-react";

interface Conversation {
  id: string;
  thread_id: string;
  title: string;
  updated_at: string;
}

interface SidebarProps {
  isOpen: boolean;
  conversations: Conversation[];
  activeThreadId: string | null;
  onSelectConversation: (threadId: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (threadId: string) => void;
  onClose: () => void;
}

export default function Sidebar({
  isOpen,
  conversations,
  activeThreadId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onClose,
}: SidebarProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 40,
              display: "none",
            }}
            className="md:hidden"
          />

          {/* Sidebar Panel */}
          <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{
              position: "fixed",
              left: 0,
              top: 0,
              bottom: 0,
              width: 260,
              background: "var(--bg-surface)",
              borderRight: "1px solid var(--border-subtle)",
              display: "flex",
              flexDirection: "column",
              zIndex: 50,
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "20px 16px 16px",
                borderBottom: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  background: "var(--accent-gradient)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Conversations
              </span>
              <button
                onClick={onClose}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: 4,
                  borderRadius: 4,
                  display: "flex",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* New Chat Button */}
            <div style={{ padding: "12px 16px" }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onNewConversation}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "var(--accent-gradient)",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  color: "#000",
                }}
              >
                <Plus size={15} />
                New Research
              </motion.button>
            </div>

            {/* Conversation List */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "0 8px 16px",
              }}
            >
              {conversations.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 16px",
                    color: "var(--text-muted)",
                    fontSize: "0.8rem",
                  }}
                >
                  No conversations yet.
                  <br />
                  Start a new research above.
                </div>
              ) : (
                conversations.map((conv) => (
                  <motion.div
                    key={conv.thread_id}
                    whileHover={{ backgroundColor: "rgba(255,255,255,0.04)" }}
                    style={{
                      padding: "10px 10px",
                      borderRadius: 8,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 2,
                      background:
                        activeThreadId === conv.thread_id
                          ? "rgba(0, 240, 255, 0.08)"
                          : "transparent",
                      border:
                        activeThreadId === conv.thread_id
                          ? "1px solid rgba(0, 240, 255, 0.15)"
                          : "1px solid transparent",
                    }}
                    onClick={() => onSelectConversation(conv.thread_id)}
                  >
                    <MessageSquare
                      size={14}
                      color={
                        activeThreadId === conv.thread_id
                          ? "var(--accent-cyan)"
                          : "var(--text-muted)"
                      }
                    />
                    <span
                      style={{
                        fontSize: "0.8rem",
                        color:
                          activeThreadId === conv.thread_id
                            ? "var(--text-primary)"
                            : "var(--text-secondary)",
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {conv.title || "Untitled Research"}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conv.thread_id);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-muted)",
                        opacity: 0,
                        padding: 2,
                        display: "flex",
                      }}
                      className="delete-btn"
                    >
                      <Trash2 size={12} />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
