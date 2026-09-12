import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

export const SceneFeatured: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance
  const cardSpring = spring({ frame: frame - 5, fps, config: theme.spring.smooth });
  const textSpring = spring({ frame: frame - 20, fps, config: theme.spring.smooth });

  // Ken Burns zoom & tilt
  const zoom = interpolate(frame, [0, 120], [1, 1.07], { easing: theme.ease.inOut });
  const rotY = interpolate(cardSpring, [0, 1], [15, -4]);
  const rotX = interpolate(cardSpring, [0, 1], [-10, 3]);

  // Holographic scan line
  const scanProgress = interpolate(frame, [25, 95], [0, 1], {
    easing: theme.ease.inOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Exit
  const exitX = interpolate(frame, [105, 120], [0, -100], {
    easing: theme.ease.in,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(frame, [105, 120], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        opacity: exitOpacity,
        transform: `translateX(${exitX}px)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 100px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 70,
          maxWidth: 1500,
          perspective: 1200,
        }}
      >
        {/* Left: 3D Certificate Card */}
        <div
          style={{
            flex: "0 0 740px",
            height: 520,
            borderRadius: 24,
            overflow: "hidden",
            position: "relative",
            background: "#040711",
            border: "2px solid rgba(0, 255, 136, 0.4)",
            boxShadow: "0 30px 90px rgba(0,0,0,0.8), 0 0 50px rgba(0, 255, 136, 0.2)",
            transform: `
              scale(${interpolate(cardSpring, [0, 1], [0.85, 1])})
              rotateY(${rotY}deg)
              rotateX(${rotX}deg)
            `,
            opacity: cardSpring,
          }}
        >
          {/* Certificate Image with Ken Burns */}
          <div style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative" }}>
            <Img
              src={staticFile("certs/Certificate.jpg")}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                padding: 16,
                transform: `scale(${zoom})`,
              }}
            />
          </div>

          {/* Laser Scan Line */}
          <div
            style={{
              position: "absolute",
              top: `${scanProgress * 100}%`,
              left: 0,
              right: 0,
              height: 3,
              background: "linear-gradient(90deg, transparent, rgba(0, 255, 136, 0.95), rgba(0, 212, 255, 0.95), transparent)",
              boxShadow: "0 0 20px #00FF88, 0 0 40px #00D4FF",
              opacity: scanProgress > 0 && scanProgress < 1 ? 1 : 0,
            }}
          />

          {/* Star Badge */}
          <div
            style={{
              position: "absolute",
              top: 20,
              left: 20,
              padding: "6px 14px",
              borderRadius: 6,
              background: "rgba(0, 255, 136, 0.2)",
              border: "1px solid rgba(0, 255, 136, 0.6)",
              color: "#00FF88",
              fontFamily: "monospace",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.08em",
            }}
          >
            ★ FEATURED CREDENTIAL
          </div>
        </div>

        {/* Right: Info & Proof */}
        <div
          style={{
            flex: 1,
            opacity: textSpring,
            transform: `translateX(${interpolate(textSpring, [0, 1], [50, 0])}px)`,
          }}
        >
          <div
            style={{
              display: "inline-block",
              fontFamily: "monospace",
              fontSize: 14,
              fontWeight: 700,
              color: theme.colors.accent,
              letterSpacing: "0.15em",
              marginBottom: 12,
            }}
          >
            TIER-1 GOOGLE ADS MASTERY
          </div>
          <h2
            style={{
              fontSize: 48,
              fontWeight: 800,
              color: theme.colors.text,
              margin: "0 0 16px 0",
              lineHeight: 1.15,
            }}
          >
            Google Ads Professional
          </h2>
          <p
            style={{
              fontSize: 22,
              color: theme.colors.primary,
              margin: "0 0 24px 0",
              fontWeight: 600,
            }}
          >
            Personally Mentored by Ian Baillo
          </p>
          <p
            style={{
              fontSize: 18,
              color: theme.colors.textMuted,
              lineHeight: 1.6,
              margin: "0 0 32px 0",
            }}
          >
            Rigorous hands-on training under one of the top Google Ads authorities in the Philippines. Trained in multi-tier bidding, high-intent keyword architecture, and negative keyword defense.
          </p>

          <div
            style={{
              display: "flex",
              gap: 20,
            }}
          >
            <div
              style={{
                padding: "12px 20px",
                borderRadius: 10,
                background: "rgba(0, 212, 255, 0.08)",
                border: "1px solid rgba(0, 212, 255, 0.3)",
              }}
            >
              <div style={{ color: "#00D4FF", fontSize: 20, fontWeight: 800 }}>67% Less</div>
              <div style={{ color: theme.colors.textMuted, fontSize: 12, fontFamily: "monospace" }}>Ad Spend Waste</div>
            </div>
            <div
              style={{
                padding: "12px 20px",
                borderRadius: 10,
                background: "rgba(0, 255, 136, 0.08)",
                border: "1px solid rgba(0, 255, 136, 0.3)",
              }}
            >
              <div style={{ color: "#00FF88", fontSize: 20, fontWeight: 800 }}>+211%</div>
              <div style={{ color: theme.colors.textMuted, fontSize: 12, fontFamily: "monospace" }}>Conversion Boost</div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
