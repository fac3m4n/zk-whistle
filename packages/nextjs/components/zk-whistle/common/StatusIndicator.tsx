"use client";

type StatusIndicatorProps = {
  status: "active" | "triggered" | "deactivated" | "loading";
  label?: string;
  size?: "sm" | "md" | "lg";
};

const statusConfig = {
  active: { color: "badge-success", text: "Active", dot: "bg-success" },
  triggered: { color: "badge-error", text: "Triggered", dot: "bg-error" },
  deactivated: { color: "badge-ghost", text: "Deactivated", dot: "bg-base-content/30" },
  loading: { color: "badge-ghost", text: "Loading...", dot: "bg-base-content/30" },
};

const sizeClasses = {
  sm: "badge-sm text-xs",
  md: "badge-md text-sm",
  lg: "badge-lg text-base",
};

/**
 * Visual status indicator for vault/switch state.
 */
export const StatusIndicator = ({ status, label, size = "md" }: StatusIndicatorProps) => {
  const config = statusConfig[status];

  return (
    <div className={`badge ${config.color} ${sizeClasses[size]} gap-1`}>
      <div className={`w-2 h-2 rounded-full ${config.dot} ${status === "active" ? "animate-pulse" : ""}`} />
      {label ?? config.text}
    </div>
  );
};
