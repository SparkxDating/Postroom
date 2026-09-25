export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#231f1a" />
      <path d="M7 11.5h18v11H7z" fill="none" stroke="#f3ecdf" strokeWidth="1.6" />
      <path d="M7 12l9 6.2L25 12" fill="none" stroke="#f3ecdf" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="24" cy="22" r="3" fill="#d23b2a" />
    </svg>
  );
}
