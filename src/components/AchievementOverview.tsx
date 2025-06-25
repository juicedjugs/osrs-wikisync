import {
  useAchievementDiaryRegionStats,
  usePlayerData,
  useAchievementDiaries,
  useApp,
} from "../state";

const AchievementOverview = () => {
  const { playerData, isLoading, error } = usePlayerData();
  const { achievementDiaries, loaded } = useAchievementDiaries();
  const regionStats = useAchievementDiaryRegionStats();
  const { actions } = useApp();

  const handleRegionClick = (region: string) => {
    actions.showAchievementList(region);
  };

  if (isLoading) {
    return (
      <div className="achievement-overview">
        <div className="loading">Loading achievement diaries...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="achievement-overview">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  if (!loaded || achievementDiaries.length === 0) {
    return (
      <div className="achievement-overview">
        <div className="no-data">
          No achievement diary data available.
          <br />
          Loaded: {loaded.toString()}
          <br />
          Count: {achievementDiaries.length}
        </div>
      </div>
    );
  }

  // Get unique regions and sort them
  const regions = Object.keys(regionStats).sort();

  return (
    <div className="achievement-overview">
      {regions.map((region) => {
        const stats = regionStats[region];
        if (!stats) {
          return (
            <div key={region} className="achievement-overview-region">
              <span className="region-name">{region}</span>
              <span className="region-stats">No data available</span>
            </div>
          );
        }

        return (
          <div
            key={region}
            className="achievement-overview-region"
            onClick={() => handleRegionClick(region)}>
            <span
              className="region-name clickable"
              title={`Click to view ${region} tasks`}>
              {region}
            </span>
            <span className="region-stats">
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

export default AchievementOverview;
