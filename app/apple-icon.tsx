import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "white",
          borderRadius: "22.5%",
        }}
      >
        <svg
          width="140"
          height="140"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="2" y="20" width="7" height="8" rx="1" fill="#4ECDC4" />
          <rect x="2" y="18" width="7" height="4" rx="1" fill="#14505C" />
          <rect x="12.5" y="13" width="7" height="15" rx="1" fill="#4ECDC4" />
          <rect x="12.5" y="11" width="7" height="4" rx="1" fill="#14505C" />
          <rect x="23" y="6" width="7" height="22" rx="1" fill="#4ECDC4" />
          <rect x="23" y="4" width="7" height="4" rx="1" fill="#14505C" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
