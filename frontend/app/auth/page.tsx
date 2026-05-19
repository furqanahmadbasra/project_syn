"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import gsap from "gsap";
import { Zap } from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function AuthPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  // Check if already logged in
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.push("/");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // GSAP entrance
  useEffect(() => {
    gsap.from(cardRef.current, {
      y: 40,
      opacity: 0,
      duration: 0.7,
      ease: "power3.out",
    });
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-base)",
        padding: 24,
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "fixed",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,240,255,0.04) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div ref={cardRef} style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "var(--accent-gradient)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Zap size={24} color="#000" fill="#000" />
          </div>
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "1.8rem",
              fontWeight: 700,
              background: "var(--accent-gradient)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              marginBottom: 8,
            }}
          >
            Synapse AI
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Multi-Agent Business Research Assistant
          </p>
        </div>

        {/* Card */}
        <div
          className="glass"
          style={{
            padding: "36px 32px",
            borderRadius: 16,
            border: "1px solid var(--border-subtle)",
          }}
        >
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "1.2rem",
              fontWeight: 600,
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Welcome back
          </h2>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.82rem",
              textAlign: "center",
              marginBottom: 28,
            }}
          >
            Sign in to access your research history and saved API keys.
          </p>

          {/* Google Sign In */}
          <motion.button
            id="google-signin-btn"
            whileHover={{ scale: 1.02, boxShadow: "0 0 24px rgba(0,240,255,0.15)" }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogleSignIn}
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px 20px",
              borderRadius: 10,
              background: loading ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              fontSize: "0.9rem",
              color: loading ? "var(--text-muted)" : "var(--text-primary)",
              transition: "all 0.2s",
            }}
          >
            {/* Google Logo SVG */}
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
            </svg>
            {loading ? "Signing in..." : "Continue with Google"}
          </motion.button>

          {error && (
            <p style={{ color: "#EF4444", fontSize: "0.8rem", textAlign: "center", marginTop: 16 }}>
              {error}
            </p>
          )}

          <div
            style={{
              marginTop: 24,
              padding: "12px 16px",
              borderRadius: 8,
              background: "rgba(0,240,255,0.04)",
              border: "1px solid rgba(0,240,255,0.1)",
            }}
          >
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.6 }}>
              You can also use the app without signing in.
              <br />
              Sign in saves your API keys and conversation history.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            onClick={() => router.push("/")}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: 8,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: "0.82rem",
              marginTop: 12,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Continue without signing in →
          </motion.button>
        </div>
      </div>
    </div>
  );
}
