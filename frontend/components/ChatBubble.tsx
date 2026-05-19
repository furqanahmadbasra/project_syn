"use client";

import { motion, type Variants } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { User, Bot, AlertCircle } from "lucide-react";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "clarification";
  content: string;
  agentSteps?: string[];
  confidenceScore?: number;
  timestamp: Date;
}

interface ChatBubbleProps {
  message: Message;
  index: number;
}

/** Confidence score badge with color coding */
function ConfidenceBadge({ score }: { score: number }) {
  const color =
    score >= 8
      ? "#10B981"
      : score >= 6
      ? "#F59E0B"
      : "#EF4444";
  const label = score >= 8 ? "High" : score >= 6 ? "Good" : "Low";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 20,
        background: `${color}15`,
        border: `1px solid ${color}40`,
        marginTop: 10,
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
        }}
      />
      <span style={{ fontSize: "0.72rem", color, fontWeight: 600 }}>
        Research Confidence: {score}/10 — {label}
      </span>
    </div>
  );
}

/** Collapsible agent steps trace */
function AgentTrace({ steps }: { steps: string[] }) {
  return (
    <div
      style={{
        marginTop: 10,
        padding: "8px 12px",
        borderRadius: 8,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <p
        style={{
          fontSize: "0.7rem",
          color: "var(--text-muted)",
          fontFamily: "'Space Grotesk', sans-serif",
          marginBottom: 4,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        Agent Pipeline
      </p>
      {steps.map((step, i) => (
        <div
          key={i}
          style={{
            fontSize: "0.75rem",
            color: "var(--text-secondary)",
            padding: "2px 0",
          }}
        >
          {step}
        </div>
      ))}
    </div>
  );
}

export default function ChatBubble({ message, index }: ChatBubbleProps) {
  const isUser = message.role === "user";
  const isClarification = message.role === "clarification";

  // Spring animation for bubble entrance
  const variants: Variants = {
    hidden: { opacity: 0, y: 16, scale: 0.97 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 280,
        damping: 24,
        delay: 0.05 * Math.min(index, 3),
      },
    },
  };

  /* ── Clarification / Interrupt Message ── */
  if (isClarification) {
    return (
      <motion.div
        variants={variants}
        initial="hidden"
        animate="visible"
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "8px 24px",
        }}
      >
        <div
          className="gradient-border"
          style={{
            padding: "12px 20px",
            maxWidth: 480,
            width: "100%",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
            <AlertCircle size={18} color="var(--accent-cyan)" />
          </div>
          <p
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "0.85rem",
              color: "var(--accent-cyan)",
              fontWeight: 500,
            }}
          >
            {message.content}
          </p>
        </div>
      </motion.div>
    );
  }

  /* ── User Message ── */
  if (isUser) {
    return (
      <motion.div
        variants={variants}
        initial="hidden"
        animate="visible"
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "flex-end",
          gap: 10,
          padding: "4px 20px",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            padding: "10px 16px",
            borderRadius: "16px 16px 4px 16px",
            background: "rgba(0, 240, 255, 0.08)",
            border: "1px solid rgba(0, 240, 255, 0.15)",
            color: "var(--text-primary)",
            fontSize: "0.92rem",
            lineHeight: 1.6,
          }}
        >
          {message.content}
        </div>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "rgba(0, 240, 255, 0.1)",
            border: "1px solid rgba(0, 240, 255, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <User size={15} color="var(--accent-cyan)" />
        </div>
      </motion.div>
    );
  }

  /* ── AI / Assistant Message ── */
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "4px 20px",
      }}
    >
      {/* AI Avatar */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "linear-gradient(135deg, rgba(0,240,255,0.2), rgba(138,43,226,0.2))",
          border: "1px solid rgba(0, 240, 255, 0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        <Bot size={15} color="var(--accent-cyan)" />
      </div>

      <div style={{ maxWidth: 640, flex: 1 }}>
        {/* Response content with markdown */}
        <div
          className="markdown-content"
          style={{
            color: "var(--text-primary)",
            fontSize: "0.92rem",
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Agent pipeline trace */}
        {message.agentSteps && message.agentSteps.length > 0 && (
          <AgentTrace steps={message.agentSteps} />
        )}

        {/* Confidence badge */}
        {message.confidenceScore !== undefined && (
          <ConfidenceBadge score={message.confidenceScore} />
        )}

        {/* Timestamp */}
        <div
          style={{
            fontSize: "0.68rem",
            color: "var(--text-muted)",
            marginTop: 6,
          }}
        >
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </motion.div>
  );
}
