import React from "react";

// 24 inline SVG icons — no external assets, no emoji dependency.
// All drawn on a 24×24 coordinate grid; scaled via size prop.

type SvgIconProps = { size: number; color: string };

const ICON_PATHS: Record<string, React.FC<SvgIconProps>> = {
  battery: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="1" y="6" width="18" height="12" rx="2" stroke={color} strokeWidth="2" />
      <rect x="3" y="8" width="10" height="8" rx="1" fill={color} />
      <path d="M19 9v6" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  bolt: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M13 2L4.5 13H12L11 22L19.5 11H12L13 2Z" fill={color} stroke={color} strokeWidth="1" strokeLinejoin="round" />
    </svg>
  ),
  wifi: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 19h.01" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <path d="M4.5 14.5a10.68 10.68 0 0 1 15 0" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M7.5 11a6.38 6.38 0 0 1 9 0" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M10.5 7.5a2.12 2.12 0 0 1 3 0" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  phone: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="5" y="2" width="14" height="20" rx="3" stroke={color} strokeWidth="2" />
      <circle cx="12" cy="18" r="1" fill={color} />
    </svg>
  ),
  cloud: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M18 10a6 6 0 0 0-11.5-2.5A4.5 4.5 0 0 0 7.5 17H18a4 4 0 0 0 0-8Z" stroke={color} strokeWidth="2" fill="none" />
    </svg>
  ),
  server: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="3" width="20" height="6" rx="2" stroke={color} strokeWidth="2" />
      <rect x="2" y="13" width="20" height="6" rx="2" stroke={color} strokeWidth="2" />
      <circle cx="6" cy="6" r="1" fill={color} />
      <circle cx="6" cy="16" r="1" fill={color} />
    </svg>
  ),
  lock: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="5" y="10" width="14" height="12" rx="2" stroke={color} strokeWidth="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke={color} strokeWidth="2" />
      <circle cx="12" cy="16" r="1.5" fill={color} />
    </svg>
  ),
  key: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="8" cy="10" r="5" stroke={color} strokeWidth="2" />
      <path d="M13 10h8M17 10v3" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  magnifier: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="10" cy="10" r="7" stroke={color} strokeWidth="2" />
      <path d="M15 15l5 5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  gear: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" />
      <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  chip: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="7" y="7" width="10" height="10" rx="2" stroke={color} strokeWidth="2" />
      <path d="M9 3v4M12 3v4M15 3v4M9 17v4M12 17v4M15 17v4M3 9h4M3 12h4M3 15h4M17 9h4M17 12h4M17 15h4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  antenna: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2v20M5 7l7 5 7-5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M3 5a11 11 0 0 1 18 0" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  ),
  satellite: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M6 18L18 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <rect x="9" y="9" width="6" height="6" rx="1" stroke={color} strokeWidth="2" transform="rotate(45 12 12)" />
      <circle cx="19" cy="5" r="2" fill={color} />
    </svg>
  ),
  sun: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4" stroke={color} strokeWidth="2" />
      <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  thermometer: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2a3 3 0 0 0-3 3v8.27A5 5 0 1 0 15 16V5a3 3 0 0 0-3-3Z" stroke={color} strokeWidth="2" />
      <circle cx="12" cy="17" r="2" fill={color} />
    </svg>
  ),
  coin: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
      <path d="M12 7v2m0 6v2M10 9.5h3a1.5 1.5 0 0 1 0 3H11a1.5 1.5 0 0 0 0 3h3" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  bank: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2L2 7h20L12 2Z" stroke={color} strokeWidth="2" strokeLinejoin="round" fill="none" />
      <rect x="2" y="20" width="20" height="2" rx="1" fill={color} />
      <path d="M5 7v13M9 7v13M12 7v13M15 7v13M19 7v13" stroke={color} strokeWidth="2" />
    </svg>
  ),
  cart: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="21" r="1.5" fill={color} />
      <circle cx="18" cy="21" r="1.5" fill={color} />
    </svg>
  ),
  truck: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M1 3h15v13H1zM16 8h5l2 4v5h-7V8Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="6" cy="18.5" r="2" fill={color} />
      <circle cx="18" cy="18.5" r="2" fill={color} />
    </svg>
  ),
  factory: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M2 22V10l5-3v3l5-3v3l5-3v12H2Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <rect x="5" y="16" width="3" height="6" rx="1" fill={color} />
      <rect x="10" y="16" width="3" height="6" rx="1" fill={color} />
    </svg>
  ),
  home: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 12L12 3l9 9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v11h5v-6h4v6h5V10" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
  person: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="7" r="4" stroke={color} strokeWidth="2" />
      <path d="M4 21v-2a6 6 0 0 1 16 0v2" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  globe: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <path d="M2 12h20M12 2c-2 3-3 6.5-3 10s1 7 3 10M12 2c2 3 3 6.5 3 10s-1 7-3 10" stroke={color} strokeWidth="2" />
    </svg>
  ),
  arrow: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M13 6l6 6-6 6" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

// Fallback: circle with first letter
const FallbackIcon: React.FC<SvgIconProps & { name: string }> = ({ size, color, name }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="none" />
    <text x="12" y="17" textAnchor="middle" fontSize="13" fontWeight="700" fill={color}>
      {name[0]?.toUpperCase() ?? "?"}
    </text>
  </svg>
);

export const Icon: React.FC<{ name: string; size?: number; color?: string }> = ({ name, size = 48, color = "#1F2A44" }) => {
  const Comp = ICON_PATHS[name];
  if (!Comp) return <FallbackIcon size={size} color={color} name={name} />;
  return <Comp size={size} color={color} />;
};
