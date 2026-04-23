import { useGameStore } from "../stores/gameStore";

const HP_BAR_HEIGHT = 12;

export const HUD = () => {
  const score = useGameStore((s) => s.score);
  const playerHP = useGameStore((s) => s.playerHP);
  const playerMaxHP = useGameStore((s) => s.playerMaxHP);
  const shieldHP = useGameStore((s) => s.shieldHP);
  const shieldMaxHP = useGameStore((s) => s.shieldMaxHP);
  const chargeLevel = useGameStore((s) => s.chargeLevel);
  const barrelRollCooldown = useGameStore((s) => s.barrelRollCooldown);
  const energy = useGameStore((s) => s.energy);
  const upgrades = useGameStore((s) => s.upgrades);

  const hpPct = Math.max(0, playerHP) / playerMaxHP;
  const shieldPct = shieldMaxHP > 0 ? Math.max(0, shieldHP) / shieldMaxHP : 0;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        paddingTop: "clamp(10px, 3vw, 20px)",
        paddingBottom: "clamp(10px, 3vw, 20px)",
        paddingLeft: "clamp(12px, 4vw, 30px)",
        // Right padding reserves space for the MuteButton on touch devices
        // (top-right corner). Harmless on desktop where the mute lives in
        // the opposite corner.
        paddingRight: "clamp(60px, 14vw, 60px)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "10px",
        pointerEvents: "none",
        fontFamily: "'Roboto', sans-serif",
        color: "#00ddff",
        fontSize: "clamp(14px, 3.5vw, 18px)",
        textShadow: "0 0 10px #00aaff",
        boxSizing: "border-box",
      }}
    >
      <div style={{ minWidth: 0, flex: "1 1 auto" }}>
        <div style={{ fontSize: "clamp(11px, 2.8vw, 14px)", opacity: 0.7 }}>HULL</div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
          <div style={{ flex: "1 1 auto", minWidth: 0, maxWidth: "220px" }}>
            {/* HP bar */}
            <div
              style={{
                width: "100%",
                height: `${HP_BAR_HEIGHT}px`,
                background: "#220011",
                border: "1px solid rgba(255, 85, 136, 0.3)",
                borderRadius: "2px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${hpPct * 100}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #ff5588, #ff0055)",
                  boxShadow: "0 0 8px #ff0055",
                  transition: "width 0.15s",
                }}
              />
            </div>
            {/* Shield sub-bar (only when shield upgrade active) */}
            {shieldMaxHP > 0 && (
              <div
                style={{
                  width: "100%",
                  height: "4px",
                  background: "#001122",
                  borderRadius: "2px",
                  marginTop: "3px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${shieldPct * 100}%`,
                    height: "100%",
                    background: "#00ddff",
                    boxShadow: "0 0 6px #00aaff",
                    transition: "width 0.2s",
                  }}
                />
              </div>
            )}
          </div>
          <div
            style={{
              fontSize: "clamp(11px, 2.8vw, 14px)",
              opacity: 0.85,
              color: "#ff88aa",
              whiteSpace: "nowrap",
            }}
          >
            {Math.max(0, Math.ceil(playerHP))} / {playerMaxHP}
          </div>
        </div>

        {/* Barrel roll cooldown */}
        <div style={{ fontSize: "clamp(10px, 2.5vw, 12px)", opacity: 0.5, marginTop: "10px" }}>
          ROLL {barrelRollCooldown > 0 ? `${barrelRollCooldown.toFixed(1)}s` : "READY"}
        </div>
      </div>

      {/* Charge indicator — bottom center */}
      {chargeLevel > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: "40px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "120px",
          }}
        >
          <div
            style={{
              height: "4px",
              background: "#223344",
              borderRadius: "2px",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${chargeLevel * 100}%`,
                background: chargeLevel >= 1 ? "#00ffff" : "#0088aa",
                boxShadow: chargeLevel >= 1 ? "0 0 10px #00ffff" : "none",
                borderRadius: "2px",
                transition: "background 0.1s",
              }}
            />
          </div>
          <div
            style={{
              fontSize: "10px",
              textAlign: "center",
              marginTop: "4px",
              opacity: 0.6,
              color: chargeLevel >= 1 ? "#00ffff" : "#0088aa",
            }}
          >
            {chargeLevel >= 1 ? "RELEASE!" : "CHARGING"}
          </div>
        </div>
      )}

      <div style={{ textAlign: "right", flex: "0 0 auto", whiteSpace: "nowrap" }}>
        <div style={{ fontSize: "clamp(11px, 2.8vw, 14px)", opacity: 0.7 }}>SCORE</div>
        <div style={{ fontSize: "clamp(16px, 4.5vw, 24px)", fontWeight: "bold" }}>
          {score.toString().padStart(8, "0")}
        </div>
        <div style={{ fontSize: "clamp(11px, 2.8vw, 14px)", opacity: 0.7, marginTop: "8px" }}>
          ENERGY {energy} {upgrades.length > 0 && `| +${upgrades.length}`}
        </div>
      </div>
    </div>
  );
};
