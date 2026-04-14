import { Suspense } from "react";
import { Player } from "./Player";
import { ProjectileManager } from "./ProjectileManager";
import { EnemyManager } from "./EnemyManager";
import { AsteroidManager } from "./AsteroidManager";
import { Boss } from "./Boss";
import { Crosshair } from "./Crosshair";
import { ScreenShake } from "./ScreenShake";
import { Environment } from "./Environment";
import { useGameStore } from "../stores/gameStore";

export const Game = () => {
  const phase = useGameStore((s) => s.phase);

  return (
    <>
      <ambientLight intensity={0.45} color="#4466aa" />
      {/* Warm magenta key light — defines the lit side of ships */}
      <directionalLight position={[6, 7, 4]} intensity={1.3} color="#ffbbdd" />
      {/* Cool cyan fill — vaporwave backlight to shape the silhouette */}
      <directionalLight position={[-5, 2, -4]} intensity={0.7} color="#66aaff" />
      {/* Subtle rim from below for a floating glow */}
      <directionalLight position={[0, -4, 2]} intensity={0.35} color="#cc66ff" />

      <Environment />
      <ScreenShake />

      {(phase === "playing" || phase === "gameover" || phase === "upgrading" || phase === "victory") && (
        <Suspense fallback={null}>
          <Player />
          <ProjectileManager />
          <EnemyManager />
          <AsteroidManager />
          <Boss />
          <Crosshair />
        </Suspense>
      )}
    </>
  );
};
