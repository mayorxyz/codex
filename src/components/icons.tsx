import React from "react";

type P = { size?: number; className?: string; strokeWidth?: number };

const base = (
  { size = 16, className = "", strokeWidth = 1.8 }: P,
  children: React.ReactNode,
  viewBox = "0 0 24 24"
) => (
  <svg
    width={size}
    height={size}
    viewBox={viewBox}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const IconBrackets = (p: P) =>
  base(p, <><path d="M9 5 3.5 12 9 19" /><path d="M15 5l5.5 7L15 19" /></>);

export const IconSearch = (p: P) =>
  base(p, <><circle cx="10.5" cy="10.5" r="6.2" /><path d="m19.8 19.8-4.9-4.9" /></>);

export const IconSun = (p: P) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" />
    </>
  );

export const IconMoon = (p: P) =>
  base(p, <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />);

export const IconClock = (p: P) =>
  base(p, <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2.2" /></>);

export const IconArrowRight = (p: P) =>
  base(p, <><path d="M4 12h15" /><path d="m13.5 6 6 6-6 6" /></>);

export const IconArrowUpRight = (p: P) =>
  base(p, <><path d="M7 17 17 7" /><path d="M9 7h8v8" /></>);

export const IconCopy = (p: P) =>
  base(
    p,
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
    </>
  );

export const IconTag = (p: P) =>
  base(
    p,
    <>
      <path d="M3 11V4a1 1 0 0 1 1-1h7l10 10-8 8L3 11Z" />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
    </>
  );

export const IconDoc = (p: P) =>
  base(
    p,
    <>
      <path d="M6 2.8h8L19 7.8v12a1.4 1.4 0 0 1-1.4 1.4H6.4A1.4 1.4 0 0 1 5 19.8V4.2A1.4 1.4 0 0 1 6.4 2.8Z" />
      <path d="M14 3v5h5M8.5 12h7M8.5 15.5h7M8.5 8.5H11" />
    </>
  );

export const IconTerminal = (p: P) =>
  base(
    p,
    <>
      <rect x="2.5" y="4" width="19" height="16" rx="2" />
      <path d="m6.5 9 3 3-3 3M12.5 15h5" />
    </>
  );

export const IconPipeline = (p: P) =>
  base(
    p,
    <>
      <circle cx="5" cy="12" r="2.2" />
      <circle cx="19" cy="6" r="2.2" />
      <circle cx="19" cy="18" r="2.2" />
      <path d="M7 11l9.8-4M7 13l9.8 4" />
    </>
  );

export const IconToc = (p: P) =>
  base(p, <><path d="M9 6h12M9 12h12M9 18h12" /><circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none" /><circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none" /></>);

export const IconHash = (p: P) =>
  base(p, <><path d="M9.5 3.5 7.5 20.5M16.5 3.5l-2 17M4.5 8.5h16M3.5 15.5h16" /></>);

export const IconChevron = (p: P) =>
  base(p, <path d="m6 9 6 6 6-6" />);

export const IconBack = (p: P) =>
  base(p, <><path d="M20 12H5" /><path d="m10.5 18-6-6 6-6" /></>);

export const IconX = (p: P) =>
  base(p, <path d="M5.5 5.5l13 13M18.5 5.5l-13 13" />);

export const IconBook = (p: P) =>
  base(
    p,
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21V5.5Z" />
      <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" />
    </>
  );

export const IconPlay = (p: P) =>
  base(p, <path d="M7 4.5v15l12-7.5L7 4.5Z" />);

export const IconWords = (p: P) =>
  base(p, <><path d="M4 6h16M4 10.5h16M4 15h10M4 19.5h6" /></>);
