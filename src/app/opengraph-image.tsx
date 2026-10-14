import { ImageResponse } from "next/og";

export const alt = "Afterscan: the follow-up your scan report asked for";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#faf7f2", color: "#1c1f24", fontFamily: "Georgia, serif" }}>
        <div style={{ fontSize: 28, letterSpacing: 4, color: "#0f766e", fontFamily: "sans-serif", fontWeight: 700 }}>AFTERSCAN</div>
        <div style={{ fontSize: 72, lineHeight: 1.05, maxWidth: 1000 }}>The scan found something else. Here is what the guidelines say to do about it.</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "#4b5059", fontFamily: "sans-serif" }}>
          <span>Paste a radiology report. Get the follow-up plan, with dates.</span>
          <span>afterscan.vercel.app</span>
        </div>
      </div>
    ),
    size,
  );
}
