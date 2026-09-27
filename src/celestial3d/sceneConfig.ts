import type { MutableRefObject } from "react";
import * as THREE from "three";

/**
 * Palette shared by the 3D world (kept in sync with the CSS tokens).
 *
 * This is a bright daylight world: pale blue sky, soft white surfaces, a
 * single electric blue accent. Nothing here is dark.
 */
export const COLORS = {
  background: "#d9e8f6",
  fog: "#d9e8f6",
  blue: "#2563eb",
  blueDeep: "#1d4ed8",
  cyan: "#0ea5e9",
  cyanDeep: "#0284c7",
  amber: "#d97706",
  red: "#dc2626",
  green: "#059669",
  hull: "#f7fafc",
  hullDark: "#c2cdda",
  ground: "#e9eef5",
  cloud: "#ffffff",
} as const;

/** Takeoff duration for the login -> landing transition (ms). */
export const TAKEOFF_MS = 1500;

/** Shared refs that drive the interactive login variant of the scene. */
export interface LoginRefs {
  /** 0..1 boarding progress driven by the login form. */
  progressRef: MutableRefObject<number>;
  /** Takeoff trigger for the login -> landing transition. */
  takeoffRef: MutableRefObject<{ active: boolean; start: number }>;
}

/** Mumbai and Delhi anchors in scene space. */
export const MUMBAI = new THREE.Vector3(-5.6, 0.2, 3.8);
export const DELHI = new THREE.Vector3(5.6, 0.2, -3.8);

/** Main flight path: a high arc between the two cities. */
export const routeCurve = new THREE.QuadraticBezierCurve3(
  MUMBAI.clone(),
  new THREE.Vector3(0.2, 6.4, 0.4),
  DELHI.clone()
);

/** Ground-level rail path — a flatter, longer arc. */
export const trainCurve = new THREE.QuadraticBezierCurve3(
  new THREE.Vector3(MUMBAI.x, 0.1, MUMBAI.z),
  new THREE.Vector3(-0.4, 0.52, -1.6),
  new THREE.Vector3(DELHI.x, 0.1, DELHI.z)
);

/** Where along the main route the disruption happens (0..1). */
export const BREAK_T = 0.42;

export const BREAK_POINT = routeCurve.getPoint(BREAK_T);

/** Alternative air arcs considered during recovery (decorative branches). */
export const altAirCurves = [
  new THREE.QuadraticBezierCurve3(
    BREAK_POINT.clone(),
    new THREE.Vector3(-2.4, 4.6, -3.4),
    DELHI.clone()
  ),
  new THREE.QuadraticBezierCurve3(
    BREAK_POINT.clone(),
    new THREE.Vector3(1.8, 3.4, 4.2),
    DELHI.clone()
  ),
];

/** Narrative progress (0..1) at which each phase starts. */
export const PHASE_START = {
  journey: 0,
  disruption: 0.22,
  impact: 0.40,
  recovery: 0.55,
} as const;

/** Exact progress value (0.85) where the 3D cinematic animation reaches its final "04 — RECOVERY" composition and holds. */
export const RECOVERY_END_PROGRESS = 0.85;

export const DISRUPTION_GAP = 0.014;

/**
 * Map narrative scroll progress to a position (0..1) along the main route.
 * The aircraft advances, stalls at the disruption point, then resumes.
 */
export function travelParam(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  if (p <= PHASE_START.disruption) {
    const local = p / PHASE_START.disruption;
    return THREE.MathUtils.lerp(0, BREAK_T, local);
  }
  if (p <= PHASE_START.recovery) {
    return BREAK_T;
  }
  const local = (p - PHASE_START.recovery) / (RECOVERY_END_PROGRESS - PHASE_START.recovery);
  return THREE.MathUtils.lerp(BREAK_T, 1, Math.min(1, local));
}

/** Points along a curve, for drei <Line> geometry. */
export function samplePoints(
  curve: THREE.Curve<THREE.Vector3>,
  count = 90
): [number, number, number][] {
  return curve.getPoints(count).map((point) => [point.x, point.y, point.z]);
}

/** Camera keyframes keyed by narrative progress driving the spatial 3D transition. */
export const CAMERA_KEYS: Array<{
  at: number;
  position: [number, number, number];
  look: [number, number, number];
}> = [
  { at: 0.00, position: [-0.6, 6.2, 18.5], look: [-4.2, 1.8, 1.2] }, // 0% Wide Aerial Establishing
  { at: 0.10, position: [-4.5, 5.2, 14.8], look: [-6.2, 2.1, -1.5] }, // 10% Fly Over Airport
  { at: 0.20, position: [-1.8, 3.8, 8.4], look: [-0.2, 3.2, 0.4] },   // 20% Approach Plane GLB
  { at: 0.30, position: [-1.2, 5.6, 9.6], look: [0.2, 4.4, -0.4] },   // 30% Disruption State
  { at: 0.40, position: [-2.8, 6.5, 12.8], look: [-0.4, 2.5, -1.0] }, // 40% Reveal Network
  { at: 0.50, position: [-1.5, 4.8, 9.2], look: [0.2, 2.2, -1.4] },   // 50% AI Recovery Activation
  { at: 0.60, position: [-0.8, 3.2, 7.5], look: [1.2, 1.4, -2.0] },   // 60% Camera Follows Recovery
  { at: 0.70, position: [-0.4, 2.1, 6.4], look: [1.8, 0.8, -2.4] },   // 70% Railway Infrastructure Reveal
  { at: 0.80, position: [1.2, 1.8, 5.2], look: [3.6, 0.6, -2.8] },    // 80% Train Hero Shot
  { at: 0.85, position: [2.4, 3.6, 9.2], look: [3.0, 1.2, -2.15] },  // 85% Final 04 - RECOVERY Composition (Hold Point)
  { at: 1.00, position: [2.4, 3.6, 9.2], look: [3.0, 1.2, -2.15] },  // Terminal Freeze
];
