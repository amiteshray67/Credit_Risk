import React from "react";

export default function KPICard({ title, value, change, changeLabel, icon, className = "" }) {
  return (
    <div className={`w-full h-full ${className}`}>
      <div className="flex items-center mb-2 gap-2">
        {icon && <span className="text-3xl">{icon}</span>}
        <span className="text-lg font-semibold tracking-wide drop-shadow-sm">{title}</span>
      </div>
      <div className="text-4xl font-extrabold mb-1 drop-shadow-lg">{value}</div>
      <div className={`text-base font-semibold flex items-center gap-1 ${change >= 0 ? "text-green-400" : "text-red-400"}`}>
        {change > 0 ? `▲ ${change}%` : `▼ ${Math.abs(change)}%`}
        <span className="text-xs text-gray-200/80 font-normal ml-2">{changeLabel}</span>
      </div>
    </div>
  );
}
