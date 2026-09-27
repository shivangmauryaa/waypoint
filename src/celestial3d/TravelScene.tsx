import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import * as THREE from "three";

import { Aircraft } from "./Aircraft";
import { CameraRig } from "./CameraRig";
import { Environment } from "./Environment";
import { Route } from "./Route";
import { SpatialCorridor } from "./SpatialCorridor";
import { Train } from "./Train";

interface Props {
  progressRef: React.MutableRefObject<number>;
  /** Pause rendering when the cinematic area is off-screen. */
  active: boolean;
  reducedMotion: boolean;
  /** Lower detail for phones. */
  compact: boolean;
  /** Same narrative progress, shared with background layers for parallax. */
  parallaxRef?: React.MutableRefObject<number>;
}

export function TravelScene({
  progressRef,
  active,
  reducedMotion,
  compact,
  parallaxRef,
}: Props) {
  return (
    <div className="canvas-layer" aria-hidden="true" style={{ willChange: "transform" }}>
      <Canvas
        dpr={[1, compact ? 1.15 : 1.35]}
        frameloop={active ? "always" : "demand"}
        camera={{ position: [-2.6, 3.4, 13.2], fov: 42, near: 0.1, far: 160 }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          alpha: false,
          stencil: false,
          depth: true,
        }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <Suspense fallback={null}>
          <Environment
            compact={compact}
            reducedMotion={reducedMotion}
            parallaxRef={parallaxRef ?? progressRef}
          />
          <Route progressRef={progressRef} reducedMotion={reducedMotion} />
          <SpatialCorridor
            progressRef={progressRef}
            reducedMotion={reducedMotion}
          />
          <Aircraft
            progressRef={progressRef}
            detailed={!compact}
            reducedMotion={reducedMotion}
          />
          <Train progressRef={progressRef} detailed={!compact} />
          <CameraRig
            progressRef={progressRef}
            reducedMotion={reducedMotion}
            compact={compact}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
