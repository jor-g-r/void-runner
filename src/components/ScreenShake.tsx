import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGameStore } from "../stores/gameStore";

export const ScreenShake = () => {
  const { camera } = useThree();
  const shakeIntensity = useRef(0);
  const shakeDuration = useRef(0);
  const basePosition = useRef({ x: 0, y: 0 });

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const request = useGameStore.getState().shakeRequest;

    // Pick up new shake request
    if (request) {
      shakeIntensity.current = request.intensity;
      shakeDuration.current = request.duration;
      basePosition.current = { x: camera.position.x, y: camera.position.y };
      useGameStore.getState().clearShake();
    }

    if (shakeDuration.current > 0) {
      shakeDuration.current -= delta;
      const intensity = shakeIntensity.current * (shakeDuration.current / 0.3);
      camera.position.x = basePosition.current.x + (Math.random() - 0.5) * intensity * 2;
      camera.position.y = basePosition.current.y + (Math.random() - 0.5) * intensity * 2;
    } else {
      camera.position.x = 0;
      camera.position.y = 0;
    }
  });

  return null;
};
