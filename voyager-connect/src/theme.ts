export const colors = {
  surface: "#F9F8F6",
  onSurface: "#1C201F",
  surfaceSecondary: "#FFFFFF",
  surfaceTertiary: "#F1EFEA",
  onSurfaceTertiary: "#3D4542",
  surfaceInverse: "#1C201F",
  onSurfaceInverse: "#FFFFFF",
  brand: "#FA4659",
  onBrand: "#FFFFFF",
  brandSecondary: "#008A7A",
  brandTertiary: "#FFEBED",
  onBrandTertiary: "#BA1A2E",
  success: "#2E8540",
  warning: "#D97B06",
  error: "#D32F2F",
  border: "#E5E2DC",
  borderStrong: "#C2BEB6",
  muted: "#8A8F8C",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
};

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
};

export const font = {
  sm: 12,
  base: 14,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
};

// Liquid Glass surface tokens. `overlay` is a translucent white layer placed
// OVER the blur so text keeps WCAG-safe contrast (>=4.5:1) on any background.
export const glass = {
  blurIntensity: 60,
  tint: "light" as const,
  overlay: "rgba(255,255,255,0.72)",       // default frosted card/header
  overlayStrong: "rgba(255,255,255,0.86)", // sheets/modals (dense text)
  overlayBrand: "rgba(250,70,89,0.90)",    // frosted brand pill/banner
  border: "rgba(255,255,255,0.55)",        // top hairline highlight
  hairline: "rgba(28,32,31,0.08)",         // subtle edge
};
