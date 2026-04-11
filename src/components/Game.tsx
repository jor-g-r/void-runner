import { Player } from "./Player";
import { ProjectileManager } from "./ProjectileManager";
import { EnemyManager } from "./EnemyManager";
import { Crosshair } from "./Crosshair";
import { Environment } from "./Environment";
import { useGameStore } from "../stores/gameStore";

export const Game = () => {
  const phase = useGameStore((s) => s.phase);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />

      {/* Always render environment for depth */}
      <Environment />

      {/* Game entities — only when playing */}
      {phase === "playing" && (
        <>
          <Player />
          <ProjectileManager />
          <EnemyManager />
          <Crosshair />
        </>
      )}
    </>
  );
};
