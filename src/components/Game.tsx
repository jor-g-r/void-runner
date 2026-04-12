import { Player } from "./Player";
import { ProjectileManager } from "./ProjectileManager";
import { EnemyManager } from "./EnemyManager";
import { AsteroidManager } from "./AsteroidManager";
import { Crosshair } from "./Crosshair";
import { ScreenShake } from "./ScreenShake";
import { Environment } from "./Environment";
import { useGameStore } from "../stores/gameStore";

export const Game = () => {
  const phase = useGameStore((s) => s.phase);

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />

      <Environment />
      <ScreenShake />

      {(phase === "playing" || phase === "gameover" || phase === "upgrading" || phase === "victory") && (
        <>
          <Player />
          <ProjectileManager />
          <EnemyManager />
          <AsteroidManager />
          <Crosshair />
        </>
      )}
    </>
  );
};
