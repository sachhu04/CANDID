import React from "react";

export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="candid-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" /> {/* Indigo 400 */}
          <stop offset="50%" stopColor="#4f46e5" /> {/* Indigo 600 */}
          <stop offset="100%" stopColor="#06b6d4" /> {/* Cyan 500 */}
        </linearGradient>
      </defs>
      {/* Outer stylized C representing the Candid name */}
      <path
        d="M24 7C21.2 4.8 17.7 3.5 14 3.5C7.1 3.5 1.5 9.1 1.5 16C1.5 22.9 7.1 28.5 14 28.5C17.7 28.5 21.2 27.2 24 25"
        stroke="url(#candid-logo-grad)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* Inner lens dot representing insight and truth */}
      <circle cx="16" cy="16" r="3.5" fill="url(#candid-logo-grad)" />
      {/* Horizontal alignment/scanning element */}
      <path
        d="M23 16H29"
        stroke="url(#candid-logo-grad)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
