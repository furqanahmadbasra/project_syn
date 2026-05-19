"use client";

/**
 * SkeletonLoader - Shimmer placeholder while AI agents process.
 * Shows animated lines that suggest content is incoming.
 */
export default function SkeletonLoader() {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      {/* Avatar placeholder */}
      <div
        className="skeleton flex-shrink-0"
        style={{ width: 32, height: 32, borderRadius: "50%" }}
      />
      <div className="flex flex-col gap-2 flex-1" style={{ maxWidth: 520 }}>
        <div className="skeleton" style={{ height: 14, width: "65%" }} />
        <div className="skeleton" style={{ height: 14, width: "85%" }} />
        <div className="skeleton" style={{ height: 14, width: "50%" }} />
        <div className="skeleton" style={{ height: 14, width: "72%" }} />
      </div>
    </div>
  );
}
