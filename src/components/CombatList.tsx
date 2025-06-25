import { useEffect, useRef } from "react";
import { useCombatAchievements, useApp } from "../state";

const CombatList = () => {
  const { combatAchievements, loaded } = useCombatAchievements();
  const { state, actions } = useApp();
  const { showCombatList, scrollToTier } = state;
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Define the tier order for display
  const tierOrder = [
    "Easy",
    "Medium",
    "Hard",
    "Elite",
    "Master",
    "Grandmaster",
  ];

  // Helper function to get tier from points
  const getTierFromPoints = (points: number): string => {
    switch (points) {
      case 1:
        return "Easy";
      case 2:
        return "Medium";
      case 3:
        return "Hard";
      case 4:
        return "Elite";
      case 5:
        return "Master";
      case 6:
        return "Grandmaster";
      default:
        return "Unknown";
    }
  };

  // Group achievements by tier
  const achievementsByTier = combatAchievements.reduce((acc, achievement) => {
    const tier = getTierFromPoints(achievement.points);
    if (!acc[tier]) {
      acc[tier] = [];
    }
    acc[tier].push(achievement);
    return acc;
  }, {} as Record<string, typeof combatAchievements>);

  // Scroll to specific tier when component mounts or scrollToTier changes
  useEffect(() => {
    if (scrollToTier && scrollRefs.current[scrollToTier]) {
      setTimeout(() => {
        scrollRefs.current[scrollToTier]?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [scrollToTier, showCombatList]);

  if (!loaded || combatAchievements.length === 0) {
    return (
      <div className="combat-list">
        <div className="combat-list-header">
          <h2>Combat Achievements</h2>
          <button onClick={() => actions.hideCombatList()}>Back</button>
        </div>
        <div className="combat-list-content">
          <div className="no-data">No combat achievement data available.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="combat-list">
      <div className="combat-list-header">
        <h2>{scrollToTier || "Combat Achievements"}</h2>
        <button onClick={() => actions.hideCombatList()}>Back</button>
      </div>

      <div className="combat-list-content">
        {scrollToTier
          ? // Show only the selected tier
            (() => {
              const tierAchievements = achievementsByTier[scrollToTier] || [];
              const completedCount = tierAchievements.filter(
                (a) => a.completed,
              ).length;
              const totalCount = tierAchievements.length;

              return (
                <div className="combat-tier-section">
                  <div className="tier-achievements">
                    {tierAchievements.length === 0 ? (
                      <div className="no-achievements">
                        No achievements in this tier
                      </div>
                    ) : (
                      tierAchievements.map((achievement) => (
                        <div
                          key={achievement.id}
                          className={`achievement-item ${
                            achievement.completed ? "completed" : "incomplete"
                          }`}>
                          <div className="achievement-header">
                            <span className="achievement-name">
                              {achievement.name}
                            </span>
                            <span className="achievement-monster">
                              {achievement.monster}
                            </span>
                            <span className="achievement-points">
                              {achievement.points} pts
                            </span>
                          </div>
                          <div className="achievement-description">
                            {achievement.description}
                          </div>
                          {achievement.link && (
                            <a
                              href={achievement.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="achievement-link">
                              View on Wiki
                            </a>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })()
          : // Show all tiers (fallback)
            tierOrder.map((tier) => {
              const tierAchievements = achievementsByTier[tier] || [];
              const completedCount = tierAchievements.filter(
                (a) => a.completed,
              ).length;
              const totalCount = tierAchievements.length;

              return (
                <div
                  key={tier}
                  className="combat-tier-section"
                  ref={(el) => {
                    scrollRefs.current[tier] = el;
                  }}>
                  <h3 className="tier-header">
                    {tier} ({completedCount}/{totalCount})
                  </h3>
                  <div className="tier-achievements">
                    {tierAchievements.length === 0 ? (
                      <div className="no-achievements">
                        No achievements in this tier
                      </div>
                    ) : (
                      tierAchievements.map((achievement) => (
                        <div
                          key={achievement.id}
                          className={`achievement-item ${
                            achievement.completed ? "completed" : "incomplete"
                          }`}>
                          <div className="achievement-header">
                            <span className="achievement-name">
                              {achievement.name}
                            </span>
                            <span className="achievement-monster">
                              {achievement.monster}
                            </span>
                            <span className="achievement-points">
                              {achievement.points} pts
                            </span>
                          </div>
                          <div className="achievement-description">
                            {achievement.description}
                          </div>
                          {achievement.link && (
                            <a
                              href={achievement.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="achievement-link">
                              View on Wiki
                            </a>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
};

export default CombatList;
