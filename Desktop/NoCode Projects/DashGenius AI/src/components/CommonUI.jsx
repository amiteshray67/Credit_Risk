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
    <div className={`dashboard-card p-6 rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 shadow-xl border border-gray-700/40 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Simple KPI display
 */
export function KPI({ value, label, icon }) {
  return (
    <div className="dashboard-card p-6 rounded-2xl bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white shadow-xl flex flex-col items-center min-w-[160px] min-h-[100px] border border-blue-900/30">
      <span className="text-3xl font-extrabold mb-2 flex items-center gap-2">{icon} {value}</span>
      <span className="text-xs uppercase tracking-wider text-blue-200/80 font-medium">{label}</span>
    </div>
  );
}
