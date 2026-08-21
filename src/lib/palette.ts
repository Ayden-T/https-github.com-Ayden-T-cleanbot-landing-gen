// Validated palette tokens (see the dataviz skill's references/palette.md).
// Kept as flat JS so chart libraries (Recharts) that need literal color
// strings can pick the right mode without re-deriving anything.

export const chrome = {
  light: {
    surface: "#fcfcfb",
    page: "#f9f9f7",
    textPrimary: "#0b0b0b",
    textSecondary: "#52514e",
    muted: "#898781",
    gridline: "#e1e0d9",
    baseline: "#c3c2b7",
    good: "#006300",
    critical: "#d03b3b",
  },
  dark: {
    surface: "#1a1a19",
    page: "#0d0d0d",
    textPrimary: "#ffffff",
    textSecondary: "#c3c2b7",
    muted: "#898781",
    gridline: "#2c2c2a",
    baseline: "#383835",
    good: "#0ca30c",
    critical: "#e66767",
  },
} as const;

// Categorical slots 1 (blue) and 2 (orange) - fixed order, never cycled.
export const categorical = {
  light: { posts: "#2a78d6", reels: "#eb6834" },
  dark: { posts: "#3987e5", reels: "#d95926" },
} as const;

export const sequential = {
  light: "#2a78d6",
  dark: "#3987e5",
} as const;

export type Mode = "light" | "dark";
