import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { theme } from "../theme";

export const BgMesh: React.FC = () => {
  const frame = useCurrentFrame();
  const d1 = Math.sin(frame / 45) * 60;
  const d2 = Math.cos(frame / 55) * 50;

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.bg, overflow: "hidden" }}>
      {/* Cyan orb */}
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          borderRadius: "50%",
          top: -200 + d1,
          right: -150 + d2,
          filter: "blur(140px)",
          background: `radial-gradient(circle, ${theme.colors.glowCyan}, transparent 70%)`,
          opacity: 0.35,
        }}
      />
      {/* Purple orb */}
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 800,
          borderRadius: "50%",
          bottom: -250 - d1,
          left: -150 - d2,
          filter: "blur(130px)",
          background: `radial-gradient(circle, ${theme.colors.glowPurple}, transparent 70%)`,
          opacity: 0.32,
        }}
      />
      {/* Emerald accent glow */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          top: "40%",
          left: "45%",
          filter: "blur(110px)",
          background: `radial-gradient(circle, ${theme.colors.glowGreen}, transparent 70%)`,
          opacity: 0.18,
        }}
      />
      {/* Futuristic Cyber Grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(0, 212, 255, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 212, 255, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 85%)",
        }}
      />
    </AbsoluteFill>
  );
};

export const Grade: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.primary,
        mixBlendMode: "soft-light",
        opacity: 0.12,
      }}
    />
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, rgba(6,8,16,0.2) 0%, transparent 25%, transparent 75%, rgba(6,8,16,0.3) 100%)",
      }}
    />
  </AbsoluteFill>
);

export const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  const noise = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E")`;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        backgroundImage: noise,
        backgroundSize: "200px",
        backgroundPosition: `${(frame * 11) % 200}px ${(frame * 17) % 200}px`,
        opacity: 0.035,
        mixBlendMode: "overlay",
      }}
    />
  );
};

export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      background: "radial-gradient(ellipse at center, transparent 60%, rgba(6,8,16,0.65) 100%)",
    }}
  />
);
