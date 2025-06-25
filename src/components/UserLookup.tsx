import { useState, useEffect } from "react";
import { useApp } from "../state";
import { getCacheStatus, clearAllCache } from "../utils";

const UserLookup = () => {
  const [username, setUsername] = useState("");
  const [cacheStatus, setCacheStatus] = useState(getCacheStatus());
  const { actions, state } = useApp();

  // Update cache status when component mounts and when loading state changes
  useEffect(() => {
    setCacheStatus(getCacheStatus());
  }, [state.baseDataLoaded]); // Re-check cache status when base data is loaded

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      await actions.loadPlayerData(username.trim());
    }
  };

  const handleLoadCombatAchievements = async () => {
    await actions.loadPlayerData(username);
  };

  const handleClearCache = () => {
    clearAllCache();
    setCacheStatus(getCacheStatus());
  };

  const formatLastUpdated = (timestamp?: string) => {
    if (!timestamp) return null;
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return null;
    }
  };

  return (
    <div className="user-lookup">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter RuneScape username"
          disabled={state.isLoading}
        />
        <button type="submit" disabled={state.isLoading || !username.trim()}>
          {state.isLoading ? "Loading..." : "Search"}
        </button>
      </form>

      {/* Cache status indicator */}
      <div className="cache-status">
        <small>
          {cacheStatus.combatTasks && cacheStatus.diaryTasks ? (
            <>
              📦 Using cached data
              {cacheStatus.lastUpdated && (
                <span>
                  {" "}
                  (updated {formatLastUpdated(cacheStatus.lastUpdated)})
                </span>
              )}
            </>
          ) : (
            "🔄 Loading fresh data from wiki..."
          )}
        </small>
        <button
          onClick={handleClearCache}
          className="cache-clear-btn"
          title="Clear cached data and reload from wiki">
          🗑️ Clear Cache
        </button>
      </div>

      {state.error && <div className="error">{state.error}</div>}
    </div>
  );
};

export default UserLookup;
