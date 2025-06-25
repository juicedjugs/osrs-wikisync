import { useEffect, useRef } from "react";
import { useAchievementDiaries, useApp } from "../state";

const AchievementList = () => {
  const { achievementDiaries, loaded } = useAchievementDiaries();
  const { state, actions } = useApp();
  const { showAchievementList, scrollToRegion } = state;
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Group achievements by region
  const achievementsByRegion = achievementDiaries.reduce((acc, achievement) => {
    const region = achievement.region;
    if (!acc[region]) {
      acc[region] = [];
    }
    acc[region].push(achievement);
    return acc;
  }, {} as Record<string, typeof achievementDiaries>);

  // Scroll to specific region when component mounts or scrollToRegion changes
  useEffect(() => {
    if (scrollToRegion && scrollRefs.current[scrollToRegion]) {
      setTimeout(() => {
        scrollRefs.current[scrollToRegion]?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [scrollToRegion, showAchievementList]);

  if (!loaded || achievementDiaries.length === 0) {
    return (
      <div className="achievement-list">
        <div className="achievement-list-header">
          <h2>Achievement Diaries</h2>
          <button onClick={() => actions.hideAchievementList()}>Back</button>
        </div>
        <div className="achievement-list-content">
          <div className="no-data">No achievement diary data available.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="achievement-list">
      <div className="achievement-list-header">
        <h2>{scrollToRegion || "Achievement Diaries"}</h2>
        <button onClick={() => actions.hideAchievementList()}>Back</button>
      </div>

      <div className="achievement-list-content">
        {scrollToRegion
          ? // Show only the selected region
            (() => {
              const regionAchievements =
                achievementsByRegion[scrollToRegion] || [];
              const completedCount = regionAchievements.filter(
                (a) => a.completed,
              ).length;
              const totalCount = regionAchievements.length;

              return (
                <div className="achievement-region-section">
                  <div className="region-achievements">
                    {regionAchievements.length === 0 ? (
                      <div className="no-achievements">
                        No achievements in this region
                      </div>
                    ) : (
                      regionAchievements.map((achievement, index) => (
                        <div
                          key={`${achievement.region}-${achievement.difficulty}-${index}`}
                          className={`achievement-item ${
                            achievement.completed ? "completed" : "incomplete"
                          }`}>
                          <div className="achievement-header">
                            <span className="achievement-difficulty">
                              {achievement.difficulty}
                            </span>
                            <span className="achievement-description">
                              {achievement.description}
                            </span>
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
          : // Show all regions (fallback)
            Object.keys(achievementsByRegion)
              .sort()
              .map((region) => {
                const regionAchievements = achievementsByRegion[region] || [];
                const completedCount = regionAchievements.filter(
                  (a) => a.completed,
                ).length;
                const totalCount = regionAchievements.length;

                return (
                  <div
                    key={region}
                    className="achievement-region-section"
                    ref={(el) => {
                      scrollRefs.current[region] = el;
                    }}>
                    <h3 className="region-header">
                      {region} ({completedCount}/{totalCount})
                    </h3>
                    <div className="region-achievements">
                      {regionAchievements.length === 0 ? (
                        <div className="no-achievements">
                          No achievements in this region
                        </div>
                      ) : (
                        regionAchievements.map((achievement, index) => (
                          <div
                            key={`${achievement.region}-${achievement.difficulty}-${index}`}
                            className={`achievement-item ${
                              achievement.completed ? "completed" : "incomplete"
                            }`}>
                            <div className="achievement-header">
                              <span className="achievement-difficulty">
                                {achievement.difficulty}
                              </span>
                              <span className="achievement-description">
                                {achievement.description}
                              </span>
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

export default AchievementList;
