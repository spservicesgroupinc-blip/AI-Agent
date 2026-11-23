import React from 'react';

interface BrandMarkProps {
  className?: string;
  size?: number;
  label?: string;
}

export const BrandMark: React.FC<BrandMarkProps> = ({
  className = '',
  size = 32,
  label = 'RelayOps',
}) => (
  <svg
    className={`shrink-0 ${className}`}
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    role="img"
    aria-label={label}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Top-left workflow input bracket */}
    <path
      d="M5 6H31V14H13V29H5V6Z"
      fill="var(--brand-logo)"
    />
    {/* Bottom-right workflow output bracket */}
    <path
      d="M43 42H17V34H35V19H43V42Z"
      fill="currentColor"
    />
    {/* Center automation relay node */}
    <rect
      x="19"
      y="19"
      width="10"
      height="10"
      rx="2"
      fill="var(--brand)"
    />
  </svg>
);
