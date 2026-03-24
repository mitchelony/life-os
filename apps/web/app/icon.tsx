import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #102018, #3d6f5e)",
          color: "#f7f5f0",
          fontSize: 180,
          fontWeight: 700,
          letterSpacing: -16,
        }}
      >
        L
      </div>
    ),
    size,
  );
}
