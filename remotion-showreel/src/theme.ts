import { Easing } from "remotion";

export const theme = {
  colors: {
    bg: "#060810",
    bgAlt: "#0A0E1A",
    primary: "#00D4FF",
    secondary: "#7B2FFF",
    accent: "#00FF88",
    text: "#FFFFFF",
    textMuted: "#94A3B8",
    glowCyan: "rgba(0, 212, 255, 0.45)",
    glowPurple: "rgba(123, 47, 255, 0.4)",
    glowGreen: "rgba(0, 255, 136, 0.4)",
    cardBg: "rgba(10, 15, 30, 0.88)",
    cardBorder: "rgba(0, 212, 255, 0.25)",
  },
  ease: {
    out: Easing.bezier(0.16, 1, 0.3, 1),
    inOut: Easing.bezier(0.83, 0, 0.17, 1),
    in: Easing.bezier(0.7, 0, 0.84, 0),
  },
  spring: {
    snappy: { damping: 14, stiffness: 160, mass: 0.6 },
    smooth: { damping: 20, stiffness: 90, mass: 1 },
    bouncy: { damping: 11, stiffness: 170, mass: 0.7 },
  },
} as const;
