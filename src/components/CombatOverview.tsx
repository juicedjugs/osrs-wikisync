import {
  useCombatAchievementTierStats,
  usePlayerData,
  useCombatAchievements,
  useApp,
} from "../state";

const CombatOverview = () => {
  const { playerData, isLoading, error } = usePlayerData();
  const { combatAchievements, loaded } = useCombatAchievements();
  const tierStats = useCombatAchievementTierStats();
  const { actions } = useApp();

  // Define the tier order for display
  const tierOrder = [
    "Easy",
    "Medium",
    "Hard",
    "Elite",
    "Master",
    "Grandmaster",
  ];

  const handleTierClick = (tier: string) => {
    actions.showCombatList(tier);
  };

  if (isLoading) {
    return (
      <div className="combat-overview">
        <div className="loading">Loading combat achievements...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="combat-overview">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  if (!loaded || combatAchievements.length === 0) {
    return (
      <div className="combat-overview">
        <div className="no-data">
          No combat achievement data available.
          <br />
          Loaded: {loaded.toString()}
          <br />
          Count: {combatAchievements.length}
        </div>
      </div>
    );
  }

  return (
    <div className="combat-overview">
      {tierOrder.map((tier) => {
        const stats = tierStats[tier];
        if (!stats) {
          return (
            <div key={tier} className="combat-overview-tier">
              <span className="tier-name">{tier}</span>
              <span className="tier-stats">No data available</span>
            </div>
          );
        }

        return (
          <div
            key={tier}
            className="combat-overview-tier"
            onClick={() => handleTierClick(tier)}>
            <span
              className="tier-name clickable"
              title={`Click to view ${tier} tasks`}>
              {tier}
            </span>
            <span className="tier-stats">
              {playerData
                ? `${stats.completed}/${stats.total}`
                : `??/${stats.total}`}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default CombatOverview;
