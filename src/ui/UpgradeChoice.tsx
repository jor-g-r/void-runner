import { useMemo } from "react";
import { useGameStore } from "../stores/gameStore";
import { UPGRADES } from "../data/upgrades";

export const UpgradeChoice = () => {
  const applyUpgrade = useGameStore((s) => s.applyUpgrade);
  const currentUpgrades = useGameStore((s) => s.upgrades);

  // Pick 2 random upgrades the player doesn't already have
  const choices = useMemo(() => {
    const available = UPGRADES.filter((u) => !currentUpgrades.includes(u.id));
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2);
  }, [currentUpgrades]);

  if (choices.length === 0) {
    // All upgrades taken, skip
    useGameStore.setState({ phase: "playing" });
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Roboto', sans-serif",
        background: "rgba(0, 0, 8, 0.7)",
        pointerEvents: "auto",
      }}
    >
      <h2
        style={{
          color: "#00ffcc",
          fontSize: "28px",
          marginBottom: "30px",
          textShadow: "0 0 15px #00aa88",
        }}
      >
        CHOOSE UPGRADE
      </h2>
      <div style={{ display: "flex", gap: "20px" }}>
        {choices.map((upgrade) => (
          <button
            key={upgrade.id}
            onClick={() => applyUpgrade(upgrade.id)}
            style={{
              background: "rgba(0, 50, 60, 0.8)",
              border: "1px solid #00ddff",
              color: "#00ddff",
              padding: "20px 30px",
              fontSize: "16px",
              fontFamily: "'Roboto', sans-serif",
              cursor: "pointer",
              minWidth: "180px",
              textAlign: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0, 100, 120, 0.9)";
              e.currentTarget.style.boxShadow = "0 0 20px #00aaff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0, 50, 60, 0.8)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "8px" }}>
              {upgrade.name}
            </div>
            <div style={{ fontSize: "13px", opacity: 0.7 }}>{upgrade.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
};
