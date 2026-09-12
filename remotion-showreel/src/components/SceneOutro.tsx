import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance springs
  const shieldSpring = spring({ frame: frame - 5, fps, config: theme.spring.bouncy });
  const textSpring = spring({ frame: frame - 22, fps, config: theme.spring.smooth });
  const ctaSpring = spring({ frame: frame - 40, fps, config: theme.spring.snappy });

  // Radial spark rays (Remotion Pattern 10)
  const rays = 12;
  const raySize = 140;

  // Idle breathing (Remotion Rule 7)
  const breathe = 1 + Math.sin(frame / 20) * 0.02;
  const floatY = Math.sin(frame / 25) * 5;

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Central Shield with Radial Sparks */}
      <div
        style={{
          position: "relative",
          width: 140,
          height: 140,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 32,
          transform: `scale(${shieldSpring * breathe}) translateY(${floatY}px)`,
        }}
      >
        {/* Radial Rays */}
        {Array.from({ length: rays }).map((_, i) => {
          const p = spring({ frame: frame - 10 - i * 1.5, fps, config: theme.spring.snappy });
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 3,
                height: raySize * 0.5 * p,
                background: `linear-gradient(to top, transparent, ${theme.colors.primary})`,
                borderRadius: 2,
                transformOrigin: "50% 0%",
                transform: `translateX(-50%) rotate(${(360 / rays) * i}deg) translateY(${raySize * 0.18}px)`,
              }}
            />
          );
        })}

        {/* Central Icon Circle */}
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(0,212,255,0.2) 0%, rgba(123,47,255,0.3) 100%)",
            border: "2px solid rgba(0,212,255,0.8)",
            boxShadow: "0 0 35px rgba(0,212,255,0.5), inset 0 0 20px rgba(0,212,255,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 44,
          }}
        >
          🛡️
        </div>
      </div>

      {/* Main Pitch */}
      <div
        style={{
          maxWidth: 1000,
          opacity: textSpring,
          transform: `translateY(${interpolate(textSpring, [0, 1], [40, 0])}px)`,
        }}
      >
        <div
          style={{
            display: "inline-block",
            fontFamily: "monospace",
            fontSize: 14,
            fontWeight: 700,
            color: theme.colors.accent,
            letterSpacing: "0.14em",
            marginBottom: 14,
          }}
        >
          READY FOR MEASURABLE GROWTH?
        </div>
        <h2
          style={{
            fontSize: 54,
            fontWeight: 900,
            color: "#fff",
            margin: "0 0 20px 0",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
          }}
        >
          Scale Your Business with Verified Ads & AI Automation
        </h2>
        <p
          style={{
            fontSize: 22,
            color: theme.colors.textMuted,
            margin: "0 0 40px 0",
          }}
        >
          Marlon Palomares · Google Ads & GoHighLevel Specialist
        </p>

        {/* CTA Button */}
        <div
          style={{
            opacity: ctaSpring,
            transform: `scale(${interpolate(ctaSpring, [0, 1], [0.85, 1])})`,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              padding: "18px 42px",
              borderRadius: 50,
              background: "linear-gradient(135deg, #00D4FF 0%, #7B2FFF 100%)",
              color: "#060810",
              fontSize: 20,
              fontWeight: 800,
              boxShadow: "0 10px 40px rgba(0, 212, 255, 0.4), 0 0 20px rgba(123, 47, 255, 0.3)",
              cursor: "pointer",
            }}
          >
            <span>Book a Free Strategy Call</span>
            <span style={{ fontSize: 22 }}>↗</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
