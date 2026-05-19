"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Settings,
  Menu,
  Zap,
  Search,
  LogOut,
  ChevronRight,
} from "lucide-react";

import ChatBubble, { Message } from "@/components/ChatBubble";
import SkeletonLoader from "@/components/SkeletonLoader";
import AgentStatusBar from "@/components/AgentStatusBar";
import Sidebar from "@/components/Sidebar";
import { createClient } from "@/lib/supabase";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const AGENT_STEPS_SEQUENCE = [
  "Clarity Agent evaluating query...",
  "Research Agent querying Tavily...",
  "Validator Agent assessing quality...",
  "Synthesis Agent writing response...",
];

interface Conversation {
  id: string;
  thread_id: string;
  title: string;
  updated_at: string;
}

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  // ─── State ──────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentAgentStep, setCurrentAgentStep] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [awaitingClarification, setAwaitingClarification] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [userConfig, setUserConfig] = useState<{
    groq_api_key?: string;
    tavily_api_key?: string;
  }>({});

  // ─── Refs ────────────────────────────────────
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputAreaRef = useRef<HTMLDivElement>(null);



  // ─── Auth Check ───────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email || "" });
        loadUserConfig(data.user.id);
        loadConversations(data.user.id);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Auto-scroll to bottom ────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // ─── Load user config (API keys) from backend ─
  const loadUserConfig = useCallback(
    async (userId: string) => {
      try {
        // First check localStorage for keys set on the Config page
        const localGroq = localStorage.getItem("groq_api_key");
        const localTavily = localStorage.getItem("tavily_api_key");
        if (localGroq || localTavily) {
          setUserConfig({ groq_api_key: localGroq || "", tavily_api_key: localTavily || "" });
          return;
        }
        // Then check the backend (which checks Supabase)
        const res = await fetch(`${BACKEND_URL}/api/config/${userId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.has_config) setUserConfig(data);
        }
      } catch {
        // Silent fail - user can set keys on config page
      }
    },
    []
  );

  // ─── Load conversations from Supabase ─────────
  const loadConversations = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(30);
      if (data) setConversations(data);
    } catch {
      // Supabase may not be configured yet
    }
  }, [supabase]);

  // ─── Save conversation to Supabase ───────────
  const saveConversation = useCallback(
    async (newThreadId: string, title: string) => {
      if (!user) return;
      try {
        await supabase.from("conversations").upsert({
          user_id: user.id,
          thread_id: newThreadId,
          title,
          updated_at: new Date().toISOString(),
        });
        loadConversations(user.id);
      } catch {
        // Silent - non-critical
      }
    },
    [user, supabase, loadConversations]
  );

  // ─── Simulate agent step progression for UX ──
  const simulateAgentSteps = useCallback(async () => {
    for (const step of AGENT_STEPS_SEQUENCE) {
      setCurrentAgentStep(step);
      await new Promise((r) => setTimeout(r, 1800 + Math.random() * 1000));
    }
  }, []);

  // ─── Send Message ─────────────────────────────
  const sendMessage = useCallback(
    async (text?: string) => {
      const query = (text || inputValue).trim();
      if (!query || isLoading) return;

      setInputValue("");
      setIsLoading(true);
      setAwaitingClarification(false);

      // Add user message to UI
      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: query,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // Start simulated agent steps in background
      const stepPromise = simulateAgentSteps();

      try {
        const res = await fetch(`${BACKEND_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: query,
            thread_id: threadId,
            user_id: user?.id,
            groq_api_key: userConfig.groq_api_key || localStorage.getItem("groq_api_key"),
            tavily_api_key: userConfig.tavily_api_key || localStorage.getItem("tavily_api_key"),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.detail || "Backend error");
        }

        // Store thread ID for multi-turn memory
        if (data.thread_id && !threadId) {
          setThreadId(data.thread_id);
          saveConversation(data.thread_id, query.slice(0, 60));
        }

        await stepPromise;
        setCurrentAgentStep("");

        if (data.status === "needs_clarification") {
          // Human-in-the-loop: graph interrupted
          setAwaitingClarification(true);
          const clarifyMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: "clarification",
            content:
              data.clarification_question ||
              "Could you please clarify which company you're asking about?",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, clarifyMsg]);
        } else if (data.status === "complete") {
          const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: data.response || "Research complete.",
            agentSteps: data.agent_steps,
            confidenceScore: data.confidence_score,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMsg]);
        }
      } catch (err: unknown) {
        await stepPromise;
        setCurrentAgentStep("");
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
        const errMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "system",
          content: `⚠ Error: ${errorMessage}. Please check your API keys in [Settings](/config).`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [inputValue, isLoading, threadId, user, userConfig, simulateAgentSteps, saveConversation]
  );

  // ─── Keyboard handler ─────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ─── New Conversation ─────────────────────────
  const startNewConversation = () => {
    setMessages([]);
    setThreadId(null);
    setAwaitingClarification(false);
    setCurrentAgentStep("");
    setSidebarOpen(false);
    inputRef.current?.focus();
  };

  // ─── Sign Out ─────────────────────────────────
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
  };

  // ─── Suggestion Chips ─────────────────────────
  const suggestions = [
    "Research Tesla's latest financials",
    "Tell me about Apple's CEO",
    "What are OpenAI's recent developments?",
    "Analyze Microsoft's competitors",
  ];

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg-base)" }}>
      {/* ── Sidebar ── */}
      <Sidebar
        isOpen={sidebarOpen}
        conversations={conversations}
        activeThreadId={threadId}
        onSelectConversation={(tid) => {
          setThreadId(tid);
          setSidebarOpen(false);
          setMessages([]);
        }}
        onNewConversation={startNewConversation}
        onDeleteConversation={async (tid) => {
          if (!user) return;
          await supabase.from("conversations").delete().eq("thread_id", tid);
          setConversations((prev) => prev.filter((c) => c.thread_id !== tid));
          if (threadId === tid) startNewConversation();
        }}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ── Main Layout ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* ── Header ── */}
        <motion.header
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="glass"
          style={{
            padding: "0 20px",
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--border-subtle)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSidebarOpen((v) => !v)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-secondary)",
                display: "flex",
                padding: 6,
              }}
            >
              <Menu size={20} />
            </motion.button>

            {/* Brand */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "var(--accent-gradient)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Zap size={14} color="#000" fill="#000" />
              </div>
              <span
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: "1rem",
                  background: "var(--accent-gradient)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Synapse AI
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "var(--text-muted)",
                  fontFamily: "'Space Grotesk', sans-serif",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  marginLeft: 2,
                }}
              >
                Research
              </span>
            </div>
          </div>

          {/* Right actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Agent thread indicator */}
            {threadId && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 10px",
                  borderRadius: 20,
                  background: "rgba(0, 240, 255, 0.06)",
                  border: "1px solid rgba(0, 240, 255, 0.15)",
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#10B981",
                  }}
                />
                <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                  Thread active
                </span>
              </div>
            )}

            <Link href="/config" style={{ textDecoration: "none" }}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 8,
                  padding: "6px 10px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--text-secondary)",
                  fontSize: "0.8rem",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                <Settings size={14} />
                Config
              </motion.button>
            </Link>

            {user && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSignOut}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  display: "flex",
                  padding: 6,
                }}
              >
                <LogOut size={16} />
              </motion.button>
            )}
          </div>
        </motion.header>

        {/* ── Chat Area ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            paddingBottom: 8,
          }}
        >
          <div style={{ width: "100%", maxWidth: 780, margin: "0 auto", flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Empty state */}
          <AnimatePresence>
            {messages.length === 0 && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5 }}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "40px 24px",
                  textAlign: "center",
                }}
              >
                {/* Hero icon */}
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 20,
                    background: "linear-gradient(135deg, rgba(0,240,255,0.15), rgba(138,43,226,0.15))",
                    border: "1px solid rgba(0,240,255,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 24,
                  }}
                >
                  <Search size={32} color="var(--accent-cyan)" />
                </div>

                <h1
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: "1.6rem",
                    fontWeight: 700,
                    marginBottom: 10,
                    background: "var(--accent-gradient)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Business Intelligence at Scale
                </h1>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    maxWidth: 400,
                    fontSize: "0.9rem",
                    marginBottom: 32,
                    lineHeight: 1.7,
                  }}
                >
                  4 specialized AI agents work together to research any company —
                  news, financials, leadership, competitors & more.
                </p>

                {/* Agent pipeline visual */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 36,
                    flexWrap: "wrap",
                    justifyContent: "center",
                  }}
                >
                  {["Clarity", "Research", "Validator", "Synthesis"].map((agent, i) => (
                    <div key={agent} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div
                        style={{
                          padding: "5px 12px",
                          borderRadius: 20,
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid var(--border-subtle)",
                          fontSize: "0.75rem",
                          fontFamily: "'Space Grotesk', sans-serif",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {agent}
                      </div>
                      {i < 3 && <ChevronRight size={14} color="var(--text-muted)" />}
                    </div>
                  ))}
                </div>

                {/* Suggestion chips */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    justifyContent: "center",
                    maxWidth: 600,
                  }}
                >
                  {suggestions.map((s) => (
                    <motion.button
                      key={s}
                      whileHover={{ scale: 1.03, borderColor: "rgba(0,240,255,0.4)" }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setInputValue(s);
                        inputRef.current?.focus();
                      }}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 20,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid var(--border-subtle)",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                        fontFamily: "'Inter', sans-serif",
                        transition: "all 0.2s",
                      }}
                    >
                      {s}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 16 }}>
            {messages.map((msg, i) => (
              <ChatBubble key={msg.id} message={msg} index={i} />
            ))}
          </div>

          {/* Loading state */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {currentAgentStep && (
                  <div style={{ marginTop: 8 }}>
                    <AgentStatusBar currentStep={currentAgentStep} />
                  </div>
                )}
                <SkeletonLoader />
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={chatEndRef} />
          </div>
        </motion.div>

        {/* ── Input Area ── */}
        <motion.div 
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          style={{ padding: "10px 20px 16px", flexShrink: 0 }}
        >
          <div style={{ maxWidth: 780, margin: "0 auto" }}>
          {/* Clarification notice */}
          <AnimatePresence>
            {awaitingClarification && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                style={{
                  textAlign: "center",
                  marginBottom: 8,
                  fontSize: "0.75rem",
                  color: "var(--accent-cyan)",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                ↑ Please answer the clarification above to continue
              </motion.div>
            )}
          </AnimatePresence>

          <div
            className="glass"
            style={{
              borderRadius: 14,
              border: `1px solid ${awaitingClarification ? "rgba(0, 240, 255, 0.35)" : "var(--border-subtle)"}`,
              display: "flex",
              alignItems: "flex-end",
              gap: 10,
              padding: "10px 14px",
              transition: "border-color 0.2s",
            }}
          >
            <textarea
              ref={inputRef}
              id="chat-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                awaitingClarification
                  ? "Type your answer..."
                  : "Ask about any company — research, financials, news..."
              }
              rows={1}
              disabled={isLoading}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                outline: "none",
                color: "var(--text-primary)",
                fontSize: "0.92rem",
                resize: "none",
                fontFamily: "'Inter', sans-serif",
                lineHeight: 1.6,
                maxHeight: 120,
                overflowY: "auto",
              }}
            />
            <motion.button
              id="send-button"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => sendMessage()}
              disabled={isLoading || !inputValue.trim()}
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background:
                  isLoading || !inputValue.trim()
                    ? "rgba(255,255,255,0.05)"
                    : "var(--accent-gradient)",
                border: "none",
                cursor: isLoading || !inputValue.trim() ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.2s",
              }}
            >
              <Send
                size={16}
                color={isLoading || !inputValue.trim() ? "var(--text-muted)" : "#000"}
              />
            </motion.button>
          </div>
          <p
            style={{
              textAlign: "center",
              marginTop: 6,
              fontSize: "0.65rem",
              color: "var(--text-muted)",
            }}
          >
            Enter to send · Shift+Enter for new line
          </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
