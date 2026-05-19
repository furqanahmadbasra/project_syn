"use client";

/**
 * AgentStatusBar - Live indicator showing which agent is currently processing.
 * Displays: "Clarity Agent evaluating..." → "Research Agent querying Tavily..." etc.
 */
interface AgentStatusBarProps {
  currentStep: string;
}

const stepColors: Record<string, string> = {
  clarity: "var(--accent-cyan)",
  research: "#F59E0B",
  validator: "#8A2BE2",
  synthesis: "#10B981",
};

function getStepColor(step: string): string {
  const lower = step.toLowerCase();
  for (const [key, color] of Object.entries(stepColors)) {
    if (lower.includes(key)) return color;
  }
  return "var(--accent-cyan)";
}

export default function AgentStatusBar({ currentStep }: AgentStatusBarProps) {
  const color = getStepColor(currentStep);

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 mx-4 rounded-lg"
      style={{
        background: `rgba(${color === "var(--accent-cyan)" ? "0,240,255" : "138,43,226"}, 0.05)`,
        border: `1px solid ${color}30`,
      }}
    >
      {/* Animated neural dots */}
      <div className="flex items-center gap-1">
        <div
          className="dot-1"
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: color,
            display: "inline-block",
          }}
        />
        <div
          className="dot-2"
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: color,
            display: "inline-block",
          }}
        />
        <div
          className="dot-3"
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: color,
            display: "inline-block",
          }}
        />
      </div>
      <span
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "0.8rem",
          color: color,
          fontWeight: 500,
          letterSpacing: "0.02em",
        }}
      >
        {currentStep}
      </span>
    </div>
  );
}
