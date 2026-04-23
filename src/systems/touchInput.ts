// Shared touch-input state. TouchControls writes here on pointer events;
// Player.tsx reads here each frame. A plain module-level object keeps this
// off the Zustand store — frame-rate reads of joystick axes shouldn't
// trigger React re-renders.

export type TouchInput = {
  active: boolean;
  // Normalized joystick axes in [-1, 1]. +x = right, +y = up.
  axisX: number;
  axisY: number;
  // Set to true for one frame when roll is tapped. Player consumes and
  // resets to false.
  rollPulse: boolean;
  // True while charge button is held down.
  chargeHeld: boolean;
};

export const touchInput: TouchInput = {
  active: false,
  axisX: 0,
  axisY: 0,
  rollPulse: false,
  chargeHeld: false,
};

export const resetTouchInput = () => {
  touchInput.active = false;
  touchInput.axisX = 0;
  touchInput.axisY = 0;
  touchInput.rollPulse = false;
  touchInput.chargeHeld = false;
};
