import React from "react";

/**
 * Loader spinner for AI processing
 */
export function Loader() {
  return (
    <div className="flex justify-center items-center">
      <div className="w-10 h-10 border-4 border-gray-600 border-t-4 border-primary rounded-full animate-spin shadow-lg"></div>
    </div>
  );
}

/**
 * Card component for consistent dashboard visuals
 */
export function Card({ children, className = "" }) {
  return (
    <div className={`dashboard-card p-6 rounded-2xl ${className}`}>
      {children}
    </div>
  );
}

/**
 * Simple KPI display
 */
export function KPI({ value, label, icon, theme }) {
  // Use theme if provided for contrast
  const cardClass = theme === "light"
    ? "bg-blue-50 text-blue-900 border border-blue-200"
    : "bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white border border-blue-900/30";
  return (
    <div className={`dashboard-card p-6 rounded-2xl shadow-xl flex flex-col items-center min-w-[160px] min-h-[100px] ${cardClass}`}>
      <span className="text-3xl font-extrabold mb-2 flex items-center gap-2">{icon} {value}</span>
      <span className="text-xs uppercase tracking-wider font-medium">{label}</span>
    </div>
  );
}
