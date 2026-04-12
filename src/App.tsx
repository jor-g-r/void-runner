import { Canvas } from "@react-three/fiber";
import { Game } from "./components/Game";
import { HUD } from "./ui/HUD";
import { TitleScreen } from "./ui/TitleScreen";
import { GameOver } from "./ui/GameOver";
import { useGameStore } from "./stores/gameStore";

const App = () => {
  const phase = useGameStore((s) => s.phase);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60 }}
        style={{ position: "absolute", inset: 0 }}
      >
        <Game />
      </Canvas>

      {/* HTML overlay UI — z-index above canvas */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none" }}>
        {phase === "title" && <TitleScreen />}
        {phase === "playing" && <HUD />}
        {phase === "gameover" && <GameOver />}
      </div>
    </div>
  );
};

export default App;
