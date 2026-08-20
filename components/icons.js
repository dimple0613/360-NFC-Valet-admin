import React from "react";

const base = {
  fill: "none",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const LogoIcon = ({ size = 22, color = "#fff" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 8a7 7 0 0 1 0 8" />
    <path d="M9.5 5.5a11 11 0 0 1 0 13" />
    <path d="M13 3a15 15 0 0 1 0 18" />
  </svg>
);

const Icon = ({ d, size = 17, color = "currentColor", sw = 2, children }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {d
      ? d.map((path, i) => <path key={i} d={path} />)
      : children}
  </svg>
);

export const DashboardIcon = ({ size, color, sw = 2 }) => (
  <Icon size={size} color={color} sw={sw} d={[
    'M3 3h7.5v9H3z',
    'M13.5 3H21v5.5h-7.5z',
    'M13.5 12H21v9h-7.5z',
    'M3 15.5h7.5V21H3z',
  ]} />
);

export const BuildingIcon = ({ size, color, sw = 2 }) => (
  <Icon size={size} color={color} sw={sw} d={[
    'M3 21h18',
    'M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16',
    'M15 9h4v12',
    'M8 8h1M8 12h1M11 8h1M11 12h1',
  ]} />
);

export const UsersIcon = ({ size, color, sw = 2 }) => (
  <Icon size={size} color={color} sw={sw} d={[
    'M9 11.2a3.2 3.2 0 1 0 0-6.4a3.2 3.2 0 0 0 0 6.4Z',
    'M3 19a6 6 0 0 1 12 0',
    'M16 5.5a3.2 3.2 0 0 1 0 5',
    'M17.5 13.5A6 6 0 0 1 21 19',
  ]} />
);

export const CardIcon = ({ size, color, sw = 2 }) => (
  <Icon size={size} color={color} sw={sw} d={[
    'M2.5 5h19v14h-19z',
    'M7 15h.01M11 15h3',
    'M2.5 9.5h19',
  ]} />
);

export const TagIcon = ({ size, color, sw = 2 }) => (
  <Icon size={size} color={color} sw={sw} d={[
    'M20.6 13.4 11 3H4v7l9.6 10.4a2 2 0 0 0 2.9 0l4.1-4.1a2 2 0 0 0 0-2.9Z',
    'M8 7h.01',
  ]} />
);

export const ReportIcon = ({ size, color, sw = 2 }) => (
  <Icon size={size} color={color} sw={sw} d={[
    'M4 20V10M10 20V4M16 20v-7M21 20H3',
  ]} />
);

export const ChevronDown = ({ size = 13, color = "#6C7A93" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const ChevronRight = ({ size = 16, color = "#9AA6BC" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 5l7 7-7 7" />
  </svg>
);

export const ChevronUp = ({ size = 14, color = "#6C7A93" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 15l-6-6-6 6" />
  </svg>
);

export const ChevronLeft = ({ size = 14, color = "#9AA6BC" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 19l-7-7 7-7" />
  </svg>
);

export const SearchIcon = ({ size = 14, color = "#6C7A93" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const EyeIcon = ({ size = 19, color = "#6C7A93" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
    <circle cx="12" cy="12" r="2.6" />
  </svg>
);

export const CheckIcon = ({ size = 10, color = "#fff" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 12.5 9.5 18 20 6.5" />
  </svg>
);

export const MailIcon = ({ size = 16, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="m3.5 7 7.5 6 7.5-6" />
  </svg>
);

export const LockIcon = ({ size = 16, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="4.5" y="10.5" width="15" height="10" rx="3" />
    <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
  </svg>
);

export const LogoutIcon = ({ size = 16, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

export const UserIcon = ({ size = 16, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);

export const CarIcon = ({ size = 17, color = "#F4531F" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 11l1.2-4A2 2 0 0 1 6.1 5h11.8a2 2 0 0 1 1.9 2l1.2 4" />
    <rect x="3" y="11" width="18" height="6" rx="2" />
    <circle cx="7.5" cy="17.5" r="1.6" />
    <circle cx="16.5" cy="17.5" r="1.6" />
  </svg>
);

export const ClockIcon = ({ size = 17, color = "#0C9D61" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const BoltIcon = ({ size = 19, color = "#F4531F" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
  >
    <circle cx="12" cy="8" r="3.6" />
    <path d="M5 20a7 7 0 0 1 14 0" />
    <path d="M19 8h4M21 6v4" strokeWidth="2.4" />
  </svg>
);

export const ShieldIcon = ({ size = 19, color = "#0C9D61" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6Z" />
    <path d="M9.5 12l2 2 3.5-3.5" />
  </svg>
);

export const AlertIcon = ({ size = 16, color = "#B97B17" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 9v4M12 17h.01" />
    <path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
  </svg>
);

export const DownloadIcon = ({ size = 14, color = "#fff" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
);

export const XIcon = ({ size = 13, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.6"
    strokeLinecap="round"
  >
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const TrashIcon = ({ size = 16, color = "#C0392B" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

export const LoadingIcon = ({ size = 22, color = "#F4531F" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.4"
    strokeLinecap="round"
    className="spin"
  >
    <path d="M21 12a9 9 0 1 1-6.2-8.56" />
  </svg>
);
