import { useId } from "react";

/** 品牌 logo（台标）。线条用 currentColor，跟着亮屏 / 暗屏变色。 */
export function Logo({ size = 28, title = "oTATo" }: { size?: number; title?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 144 144" fill="none" role="img" aria-label={title}>
      <defs>
        <mask id={`cut-${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="120">
          <rect width="120" height="120" fill="#fff" />
          <circle cx="24" cy="74" r="11" fill="#000" />
          <circle cx="96" cy="74" r="11" fill="#000" />
        </mask>
      </defs>
      <g transform="translate(12 12)" stroke="currentColor">
        <path
          d="M60 25C88 25 98 48 98 68C98 88 84 100 60 100C36 100 22 88 22 68C22 48 32 25 60 25Z"
          strokeWidth="6"
          strokeLinejoin="round"
          mask={`url(#cut-${id})`}
        />
        <path d="M35 55H49M42 55V71" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M71 55H85M78 55V71" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M54 70Q60 58 66 70" strokeWidth="5" strokeLinecap="round" />
        <line x1="57" y1="65" x2="63" y2="65" strokeWidth="4" strokeLinecap="round" />
        <circle cx="24" cy="74" r="11" strokeWidth="6" />
        <circle cx="96" cy="74" r="11" strokeWidth="6" />
      </g>
    </svg>
  );
}
