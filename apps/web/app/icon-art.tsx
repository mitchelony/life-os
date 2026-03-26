type IconArtProps = {
  scale: number;
};

export function AppIconArt({ scale }: IconArtProps) {
  const cardInset = 0.17 * scale;
  const cardRadius = 0.2 * scale;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(150deg, #102018 0%, #27473b 42%, #4a7967 100%)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: `${0.08 * scale}px`,
          borderRadius: `${0.24 * scale}px`,
          background: "radial-gradient(circle at 28% 24%, rgba(247,245,240,0.2), rgba(247,245,240,0) 42%)",
          border: "1px solid rgba(247,245,240,0.12)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: `${0.12 * scale}px`,
          borderRadius: `${0.26 * scale}px`,
          border: `${0.024 * scale}px solid rgba(247,245,240,0.16)`,
          transform: "rotate(-7deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: `${cardInset}px`,
          borderRadius: `${cardRadius}px`,
          background: "linear-gradient(165deg, #faf7f1 0%, #eff0ea 100%)",
          boxShadow: `0 ${0.06 * scale}px ${0.16 * scale}px rgba(7, 15, 12, 0.28)`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: `${0.1 * scale}px`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              width: `${0.19 * scale}px`,
              height: `${0.055 * scale}px`,
              borderRadius: `${0.04 * scale}px`,
              background: "rgba(61,111,94,0.12)",
              border: `${0.008 * scale}px solid rgba(61,111,94,0.14)`,
            }}
          />
          <div
            style={{
              width: `${0.11 * scale}px`,
              height: `${0.11 * scale}px`,
              borderRadius: "999px",
              background: "#3d6f5e",
              boxShadow: `inset 0 0 0 ${0.01 * scale}px rgba(255,255,255,0.25)`,
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: `${0.05 * scale}px`,
          }}
        >
          <div
            style={{
              width: `${0.46 * scale}px`,
              height: `${0.12 * scale}px`,
              borderRadius: `${0.06 * scale}px`,
              background: "#102018",
            }}
          />
          <div
            style={{
              width: `${0.58 * scale}px`,
              height: `${0.12 * scale}px`,
              borderRadius: `${0.06 * scale}px`,
              background: "rgba(16,32,24,0.78)",
            }}
          />
          <div
            style={{
              width: `${0.36 * scale}px`,
              height: `${0.08 * scale}px`,
              borderRadius: `${0.04 * scale}px`,
              background: "#3d6f5e",
            }}
          />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: `${0.14 * scale}px`,
          width: `${0.28 * scale}px`,
          height: `${0.034 * scale}px`,
          borderRadius: `${0.04 * scale}px`,
          background: "rgba(247,245,240,0.72)",
        }}
      />
    </div>
  );
}
