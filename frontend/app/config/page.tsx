"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Settings,
  Key,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle,
  ExternalLink,
  Zap,
  Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function ConfigPage() {
  const router = useRouter();
  const supabase = createClient();
  const pageRef = useRef<HTMLDivElement>(null);

  const [groqKey, setGroqKey] = useState("");
  const [tavilyKey, setTavilyKey] = useState("");
  const [showGroq, setShowGroq] = useState(false);
  const [showTavily, setShowTavily] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [existingConfig, setExistingConfig] = useState<{ groq_key_preview?: string; tavily_key_preview?: string } | null>(null);

  // Load user and existing config
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        try {
          const res = await fetch(`${BACKEND_URL}/api/config/${data.user.id}`);
          if (res.ok) {
            const cfg = await res.json();
            if (cfg.has_config) setExistingConfig(cfg);
          }
        } catch {
          // Silent
        }
      }
    });

    // Load from localStorage
    const localGroq = localStorage.getItem("groq_api_key");
    const localTavily = localStorage.getItem("tavily_api_key");
    if (localGroq) setGroqKey(localGroq);
    if (localTavily) setTavilyKey(localTavily);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!groqKey.trim() || !tavilyKey.trim()) {
      setError("Both API keys are required.");
      return;
    }
    setSaving(true);
    setError("");

    // Always save to localStorage for immediate use
    localStorage.setItem("groq_api_key", groqKey.trim());
    localStorage.setItem("tavily_api_key", tavilyKey.trim());

    // If logged in, also save to Supabase via backend
    if (userId) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/config`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            groq_api_key: groqKey.trim(),
            tavily_api_key: tavilyKey.trim(),
          }),
        });
        if (!res.ok) throw new Error("Backend error");
      } catch {
        // Saved to localStorage at least
      }
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const fields = [
    {
      id: "groq",
      label: "Groq API Key",
      description: "Used by all 4 agents for LLM inference. Free tier available.",
      link: "https://console.groq.com/keys",
      linkText: "Get free key →",
      value: groqKey,
      setter: setGroqKey,
      show: showGroq,
      toggleShow: () => setShowGroq((v) => !v),
      placeholder: "gsk_...",
      preview: existingConfig?.groq_key_preview,
      icon: <Zap size={16} color="var(--accent-cyan)" />,
    },
    {
      id: "tavily",
      label: "Tavily API Key",
      description: "Used by the Research Agent to search the web for company data.",
      link: "https://app.tavily.com/home",
      linkText: "Get free key →",
      value: tavilyKey,
      setter: setTavilyKey,
      show: showTavily,
      toggleShow: () => setShowTavily((v) => !v),
      placeholder: "tvly-...",
      preview: existingConfig?.tavily_key_preview,
      icon: <Search size={16} color="#F59E0B" />,
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        padding: "40px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "fixed",
          top: "20%",
          left: "40%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(138,43,226,0.05) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ width: "100%", maxWidth: 560 }}
      >
        {/* Back button */}
        <Link href="/" style={{ textDecoration: "none" }}>
          <motion.button
            whileHover={{ x: -3 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: "0.85rem",
              marginBottom: 32,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <ArrowLeft size={16} />
            Back to Research
          </motion.button>
        </Link>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(0,240,255,0.1)",
                border: "1px solid rgba(0,240,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Settings size={18} color="var(--accent-cyan)" />
            </div>
            <h1
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "1.5rem",
                fontWeight: 700,
              }}
            >
              API Configuration
            </h1>
          </div>
        </div>

        {/* Key fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {fields.map((field) => (
            <motion.div
              key={field.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass"
              style={{
                padding: "20px 24px",
                borderRadius: 12,
                border: "1px solid var(--border-subtle)",
              }}
            >
              {/* Field header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {field.icon}
                  <label
                    htmlFor={`${field.id}-input`}
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                    }}
                  >
                    {field.label}
                  </label>
                </div>
                <a
                  href={field.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: "0.75rem",
                    color: "var(--accent-cyan)",
                    textDecoration: "none",
                  }}
                >
                  {field.linkText}
                  <ExternalLink size={10} />
                </a>
              </div>


              {/* Existing key preview */}
              {field.preview && !field.value && (
                <div
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    background: "rgba(16,185,129,0.08)",
                    border: "1px solid rgba(16,185,129,0.2)",
                    fontSize: "0.78rem",
                    color: "#10B981",
                    marginBottom: 10,
                    fontFamily: "monospace",
                  }}
                >
                  ✓ Saved: {field.preview}
                </div>
              )}

              {/* Input */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 8,
                  padding: "10px 12px",
                }}
              >
                <Key size={14} color="var(--text-muted)" />
                <input
                  id={`${field.id}-input`}
                  type={field.show ? "text" : "password"}
                  value={field.value}
                  onChange={(e) => field.setter(e.target.value)}
                  placeholder={field.preview ? `Current: ${field.preview}` : field.placeholder}
                  style={{
                    flex: 1,
                    background: "none",
                    border: "none",
                    outline: "none",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                    fontFamily: "monospace",
                  }}
                />
                <button
                  onClick={field.toggleShow}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    display: "flex",
                  }}
                >
                  {field.show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ color: "#EF4444", fontSize: "0.82rem", marginTop: 12, textAlign: "center" }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Save button */}
        <motion.button
          id="save-config-btn"
          whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(0,240,255,0.2)" }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving}
          style={{
            width: "100%",
            marginTop: 24,
            padding: "14px",
            borderRadius: 10,
            background: saved
              ? "rgba(16,185,129,0.15)"
              : saving
              ? "rgba(255,255,255,0.05)"
              : "var(--accent-gradient)",
            border: saved ? "1px solid rgba(16,185,129,0.3)" : "none",
            cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "0.95rem",
            color: saved ? "#10B981" : saving ? "var(--text-muted)" : "#000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "all 0.3s",
          }}
        >
          {saved ? (
            <>
              <CheckCircle size={18} />
              Keys Saved Successfully!
            </>
          ) : saving ? (
            "Saving..."
          ) : (
            "Save API Keys"
          )}
        </motion.button>

      </motion.div>
    </div>
  );
}
