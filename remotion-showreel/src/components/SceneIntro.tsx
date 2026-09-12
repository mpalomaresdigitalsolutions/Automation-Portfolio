import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrances
  const badgeSpring = spring({ frame: frame - 10, fps, config: theme.spring.snappy });
  const titleSpring = spring({ frame: frame - 25, fps, config: theme.spring.smooth });
  const subSpring = spring({ frame: frame - 40, fps, config: theme.spring.smooth });
  const hudSpring = spring({ frame: frame - 55, fps, config: theme.spring.snappy });

  // Exit (faster than entrance: last 12 frames)
  const exitY = interpolate(frame, [90, 105], [0, -60], {
    easing: theme.ease.in,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(frame, [90, 105], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Radar / reticle rotation
  const radarRot = interpolate(frame, [0, 105], [0, 220]);
  const radarScale = interpolate(spring({ frame: frame - 5, fps, config: theme.spring.smooth }), [0, 1], [0.7, 1]);

  return (
    <AbsoluteFill
      style={{
        opacity: exitOpacity,
        transform: `translateY(${exitY}px)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* HUD Reticle Background */}
      <div
        style={{
          position: "absolute",
          width: 640,
          height: 640,
          borderRadius: "50%",
          border: "1px dashed rgba(0, 212, 255, 0.25)",
          transform: `scale(${radarScale}) rotate(${radarRot}deg)`,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 30,
            borderRadius: "50%",
            border: "1px solid rgba(123, 47, 255, 0.2)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            height: 1,
            background: "linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.4), transparent)",
          }}
        />
      </div>

      <div style={{ textAlign: "center", zIndex: 5, maxWidth: 1200 }}>
        {/* Verification Pill */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 22px",
            borderRadius: 30,
            background: "rgba(0, 212, 255, 0.12)",
            border: "1px solid rgba(0, 212, 255, 0.4)",
            boxShadow: "0 0 25px rgba(0, 212, 255, 0.25)",
            opacity: badgeSpring,
            transform: `scale(${interpolate(badgeSpring, [0, 1], [0.8, 1])})`,
            marginBottom: 26,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: theme.colors.accent,
              boxShadow: "0 0 10px #00FF88",
            }}
          />
          <span
            style={{
              fontFamily: "'Space Mono', monospace, sans-serif",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: theme.colors.primary,
              textTransform: "uppercase",
            }}
          >
            VERIFIED CREDENTIALS // 8X CERTIFIED
          </span>
        </div>

        {/* Main Title */}
        <h1
          style={{
            fontSize: 74,
            fontWeight: 900,
            color: theme.colors.text,
            margin: "0 0 16px 0",
            letterSpacing: "-0.02em",
            opacity: titleSpring,
            transform: `translateY(${interpolate(titleSpring, [0, 1], [40, 0])}px)`,
            textShadow: "0 0 40px rgba(0, 212, 255, 0.35)",
          }}
        >
          Marlon Palomares
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 28,
            fontWeight: 500,
            color: theme.colors.textMuted,
            margin: "0 0 42px 0",
            opacity: subSpring,
            transform: `translateY(${interpolate(subSpring, [0, 1], [30, 0])}px)`,
          }}
        >
          Google Ads & GoHighLevel Automation Specialist
        </p>

        {/* HUD Telemetry Strip */}
        <div
          style={{
            display: "inline-flex",
            gap: 40,
            padding: "16px 36px",
            borderRadius: 16,
            background: "rgba(10, 14, 26, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            opacity: hudSpring,
            transform: `translateY(${interpolate(hudSpring, [0, 1], [30, 0])}px)`,
          }}
        >
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: theme.colors.accent }}>$10K+/mo</div>
            <div style={{ fontSize: 12, color: theme.colors.textMuted, fontFamily: "monospace" }}>Ad Spend Managed</div>
          </div>
          <div style={{ width: 1, backgroundColor: "rgba(255,255,255,0.1)" }} />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: theme.colors.primary }}>8 Certs</div>
            <div style={{ fontSize: 12, color: theme.colors.textMuted, fontFamily: "monospace" }}>Google + SEMrush</div>
          </div>
          <div style={{ width: 1, backgroundColor: "rgba(255,255,255,0.1)" }} />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: theme.colors.secondary }}>&lt; 5 min</div>
            <div style={{ fontSize: 12, color: theme.colors.textMuted, fontFamily: "monospace" }}>Lead Automation</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
