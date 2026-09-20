---
name: Tokyo Midnight Cyber-Glass
description: High-density midnight dark glass with electric magenta, neon cyan, and atmospheric glow
colors:
  bg: "#090d16"
  panel: "rgba(17, 23, 38, 0.85)"
  text: "#f8fafc"
  text-muted: "#94a3b8"
  border: "rgba(255, 255, 255, 0.08)"
  magenta: "#f43f5e"
  magenta-hover: "#fb7185"
  cyan: "#38bdf8"
  purple: "#a855f7"
  emerald: "#10b981"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"
    fontSize: "44px"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.015em"
  mono:
    fontFamily: "'SF Mono', ui-monospace, monospace"
rounded:
  sm: "8px"
  md: "12px"
  lg: "20px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "linear-gradient(to right, #f43f5e, #db2777)"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "10px 18px"
  card:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.lg}"
    padding: "20px"
---

## Overview
Tokyo Midnight Cyber-Glass is an evocative, neo-sleek aesthetic marrying deep obsidian glass with electric magenta and neon cyan accents. It evokes high-end creative workstations, midnight Tokyo rain reflections, and precision audio/video laboratory interfaces.

## Colors
- **Ground**: Deep void midnight blue (`#090d16`).
- **Glass Panel**: Translucent obsidian (`rgba(17, 23, 38, 0.85)`) with high-def backdrop blur (`backdrop-blur-2xl`).
- **Primary Accent**: Electric Magenta (`#f43f5e` / `#fb7185`) with subtle neon bloom.
- **Secondary Accent**: Neon Cyan (`#38bdf8`) for technical telemetry, speeds, and focus rings.
- **Success & Status**: Matrix Emerald (`#10b981`).

## Typography
- Apple SF Pro Display for bold, impactful titles.
- SF Mono for real-time telemetry (ETA, bitrates, speed, and media indices).

## Elevation & Depth
- Translucent stacked glass cards with subtle 1px white border (`rgba(255, 255, 255, 0.08)`).
- Cyber-glow box shadows: `0 0 25px -5px rgba(244, 63, 94, 0.35)`.
- Radial atmospheric gradients behind the main viewport.
