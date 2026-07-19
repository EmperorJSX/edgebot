import type { ReactNode } from "react";
import type { TeamCode } from "@/lib/mock";

// Inline SVG flags: emoji flags render as letter codes on Windows browsers,
// which would ruin the demo video. Simplified marks are fine at 28px.

const STAR =
  "16,9.5 17.53,13.9 22.18,13.99 18.47,16.8 19.82,21.26 16,18.6 12.18,21.26 13.53,16.8 9.82,13.99 14.47,13.9";

const hBars = (colors: string[]) => {
  const h = 32 / colors.length;
  return colors.map((c, i) => <rect key={i} y={i * h} width={32} height={h} fill={c} />);
};

const vBars = (colors: string[]) => {
  const w = 32 / colors.length;
  return colors.map((c, i) => <rect key={i} x={i * w} width={w} height={32} fill={c} />);
};

const FLAGS: Record<TeamCode, ReactNode> = {
  br: (
    <>
      <rect width={32} height={32} fill="#009739" />
      <polygon points="16,4.5 28,16 16,27.5 4,16" fill="#FEDD00" />
      <circle cx={16} cy={16} r={5} fill="#012169" />
    </>
  ),
  de: hBars(["#111111", "#DD0000", "#FFCC00"]),
  fr: vBars(["#0055A4", "#FFFFFF", "#EF4135"]),
  ar: (
    <>
      {hBars(["#74ACDF", "#FFFFFF", "#74ACDF"])}
      <circle cx={16} cy={16} r={3} fill="#F6B40E" />
    </>
  ),
  es: (
    <>
      <rect width={32} height={32} fill="#AA151B" />
      <rect y={8} width={32} height={16} fill="#F1BF00" />
    </>
  ),
  pt: (
    <>
      <rect width={13} height={32} fill="#046A38" />
      <rect x={13} width={19} height={32} fill="#DA291C" />
      <circle cx={13} cy={16} r={4.5} fill="#FFE900" />
    </>
  ),
  en: (
    <>
      <rect width={32} height={32} fill="#F7F7F7" />
      <rect x={13} width={6} height={32} fill="#CE1124" />
      <rect y={13} width={32} height={6} fill="#CE1124" />
    </>
  ),
  nl: hBars(["#AE1C28", "#FFFFFF", "#21468B"]),
  be: vBars(["#111111", "#FDDA24", "#EF3340"]),
  hr: (
    <>
      {hBars(["#C8102E", "#FFFFFF", "#012169"])}
      <rect x={12} y={7} width={4} height={3} fill="#C8102E" />
      <rect x={16} y={7} width={4} height={3} fill="#FFFFFF" />
      <rect x={12} y={10} width={4} height={3} fill="#FFFFFF" />
      <rect x={16} y={10} width={4} height={3} fill="#C8102E" />
    </>
  ),
  uy: (
    <>
      <rect width={32} height={32} fill="#FFFFFF" />
      {[3.6, 10.7, 17.8, 24.9].map((y) => (
        <rect key={y} y={y} width={32} height={3.6} fill="#0038A8" />
      ))}
      <rect width={14} height={16} fill="#FFFFFF" />
      <circle cx={7} cy={8} r={4} fill="#FCD116" />
    </>
  ),
  us: (
    <>
      <rect width={32} height={32} fill="#FFFFFF" />
      {[0, 9.1, 18.3, 27.4].map((y) => (
        <rect key={y} y={y} width={32} height={4.6} fill="#B22234" />
      ))}
      <rect width={15} height={14} fill="#3C3B6E" />
    </>
  ),
  ma: (
    <>
      <rect width={32} height={32} fill="#C1272D" />
      <polygon points={STAR} fill="#006233" />
    </>
  ),
  jp: (
    <>
      <rect width={32} height={32} fill="#FFFFFF" />
      <circle cx={16} cy={16} r={7} fill="#BC002D" />
    </>
  ),
  it: vBars(["#008C45", "#FFFFFF", "#CD212A"]),
  mx: (
    <>
      {vBars(["#006341", "#FFFFFF", "#CE1126"])}
      <circle cx={16} cy={16} r={2.5} fill="#6B4A2B" />
    </>
  ),
  dk: (
    <>
      <rect width={32} height={32} fill="#C8102E" />
      <rect x={8.5} width={5} height={32} fill="#FFFFFF" />
      <rect y={13.5} width={32} height={5} fill="#FFFFFF" />
    </>
  ),
  sn: (
    <>
      {vBars(["#00853F", "#FDEF42", "#E31B23"])}
      <polygon points={STAR} fill="#00853F" />
    </>
  ),
};

export default function Flag({ code }: { code: TeamCode }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden
      className="h-7 w-7 shrink-0 overflow-hidden rounded-full ring-1 ring-line"
    >
      {FLAGS[code]}
    </svg>
  );
}
