import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

const CERTS = [
  { file: "Google Search.png", title: "Search Ads", tag: "Google", color: "#4fc3f7" },
  { file: "Google Analytics.png", title: "Analytics", tag: "Google", color: "#4fc3f7" },
  { file: "Google display.png", title: "Display Ads", tag: "Google", color: "#4fc3f7" },
  { file: "Google Shopping.png", title: "Shopping Ads", tag: "Google", color: "#4fc3f7" },
  { file: "Google Video.png", title: "Video Ads", tag: "Google", color: "#4fc3f7" },
  { file: "Gooogle Apps.png", title: "Apps Certified", tag: "Google", color: "#4fc3f7" },
  { file: "Semrush.png", title: "SEO Strategy", tag: "SEMrush", color: "#ff6b35" },
];

export const SceneShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Header entrance
  const headerSpring = spring({ frame: frame - 5, fps, config: theme.spring.smooth });

  // Camera drift / pan across the scene
  const cameraX = interpolate(frame, [0, 120], [20, -20], { easing: theme.ease.inOut });

  // Exit
  const exitScale = interpolate(frame, [105, 120], [1, 0.92], {
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
        transform: `scale(${exitScale}) translateX(${cameraX}px)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 80px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          textAlign: "center",
          marginBottom: 40,
          opacity: headerSpring,
          transform: `translateY(${interpolate(headerSpring, [0, 1], [-30, 0])}px)`,
        }}
      >
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 14,
            fontWeight: 700,
            color: theme.colors.primary,
            letterSpacing: "0.14em",
            marginBottom: 8,
          }}
        >
          COMPREHENSIVE ADVERTISING SUITE
        </div>
        <h2 style={{ fontSize: 44, fontWeight: 800, color: "#fff", margin: 0 }}>
          Google Partner & SEMrush Certified Stack
        </h2>
      </div>

      {/* 3D Staggered Cards Grid */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 24,
          maxWidth: 1550,
          perspective: 1000,
        }}
      >
        {CERTS.map((c, i) => {
          // Staggered spring per card (4 frame offset)
          const p = spring({ frame: frame - 15 - i * 4.5, fps, config: theme.spring.bouncy });
          const scanP = interpolate(frame, [20 + i * 5, 80 + i * 5], [0, 1], {
            easing: theme.ease.inOut,
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={i}
              style={{
                width: 280,
                height: 240,
                borderRadius: 16,
                background: "rgba(10, 15, 28, 0.9)",
                border: `1px solid ${c.color}55`,
                boxShadow: `0 16px 45px rgba(0,0,0,0.6), 0 0 25px ${c.color}22`,
                overflow: "hidden",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                opacity: p,
                transform: `
                  translateY(${interpolate(p, [0, 1], [60, 0])}px)
                  scale(${interpolate(p, [0, 1], [0.82, 1])})
                  rotateY(${interpolate(p, [0, 1], [15, 0])}deg)
                `,
              }}
            >
              {/* Thumbnail Container */}
              <div
                style={{
                  flex: 1,
                  background: "#040711",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 10,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <Img
                  src={staticFile(`certs/${c.file}`)}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    filter: "brightness(1.03) contrast(1.05)",
                  }}
                />

                {/* Laser scan line */}
                <div
                  style={{
                    position: "absolute",
                    top: `${scanP * 100}%`,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: `linear-gradient(90deg, transparent, ${c.color}, transparent)`,
                    boxShadow: `0 0 10px ${c.color}`,
                    opacity: scanP > 0 && scanP < 1 ? 1 : 0,
                  }}
                />

                {/* Tag pill */}
                <div
                  style={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    padding: "3px 8px",
                    borderRadius: 4,
                    background: `${c.color}22`,
                    border: `1px solid ${c.color}66`,
                    color: c.color,
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: "monospace",
                  }}
                >
                  {c.tag}
                </div>
              </div>

              {/* Card Footer */}
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(6, 10, 20, 0.8)",
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{c.title}</div>
                <div style={{ fontSize: 11, color: theme.colors.textMuted, fontFamily: "monospace" }}>
                  Verified Specialist
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
