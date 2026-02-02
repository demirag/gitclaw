interface ClawLogoProps {
  size?: number;
  className?: string;
}

export default function ClawLogo({ size = 24, className = '' }: ClawLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Claw design - minimalist pincer/claw shape */}
      <path
        d="M8 3C8 3 6 3 5 5C4 7 4 9 5 11C6 13 8 14 10 14C10 14 9 16 9 18C9 20 10 22 12 22C14 22 15 20 15 18C15 16 14 14 14 14C16 14 18 13 19 11C20 9 20 7 19 5C18 3 16 3 16 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 3L8 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16 3L16 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Pincer tips */}
      <circle
        cx="8"
        cy="3"
        r="1.5"
        fill="currentColor"
      />
      <circle
        cx="16"
        cy="3"
        r="1.5"
        fill="currentColor"
      />
    </svg>
  );
}
