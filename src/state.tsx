import { createContext, useContext, useReducer, useEffect } from "react";
import type { ReactNode } from "react";
import {
  fetchWikiPlayerData,
  scrapeWikiCombatAchievementTasks,
  scrapeWikiAchievementDiaryTasks,
  checkCompletedCombatAchievements,
  checkCompletedAchievementDiaries,
} from "./utils";
import type {
  WikiPlayerData,
  WikiCombatAchievementTask,
  WikiAchievementDiaryTask,
} from "./utils";

// State interface
export interface AppState {
  // Cached, never mutated
  allCombatTasks: WikiCombatAchievementTask[];
  allDiaryTasks: WikiAchievementDiaryTask[];

  // Player-specific
  playerCombatTasks: WikiCombatAchievementTask[];
  playerDiaryTasks: WikiAchievementDiaryTask[];
  playerData: WikiPlayerData | null;
  username: string;

  // Loading states
  isLoading: boolean;
  error: string | null;
  baseDataLoaded: boolean; // Track when initial scraping is complete

  // UI state
  showCombatList: boolean;
  scrollToTier: string | null;
  showAchievementList: boolean;
  scrollToRegion: string | null;
}

export type AppAction =
  | { type: "SET_ALL_COMBAT_TASKS"; payload: WikiCombatAchievementTask[] }
  | { type: "SET_ALL_DIARY_TASKS"; payload: WikiAchievementDiaryTask[] }
  | { type: "SET_PLAYER_COMBAT_TASKS"; payload: WikiCombatAchievementTask[] }
  | { type: "SET_PLAYER_DIARY_TASKS"; payload: WikiAchievementDiaryTask[] }
  | { type: "SET_PLAYER_DATA"; payload: WikiPlayerData | null }
  | { type: "SET_USERNAME"; payload: string }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_BASE_DATA_LOADED"; payload: boolean }
  | { type: "SET_SHOW_COMBAT_LIST"; payload: boolean }
  | { type: "SET_SCROLL_TO_TIER"; payload: string | null }
  | { type: "SET_SHOW_ACHIEVEMENT_LIST"; payload: boolean }
  | { type: "SET_SCROLL_TO_REGION"; payload: string | null }
  | { type: "RESET_STATE" };

const initialState: AppState = {
  allCombatTasks: [],
  allDiaryTasks: [],
  playerCombatTasks: [],
  playerDiaryTasks: [],
  playerData: null,
  username: "",
  isLoading: false,
  error: null,
  baseDataLoaded: false,
  showCombatList: false,
  scrollToTier: null,
  showAchievementList: false,
  scrollToRegion: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_ALL_COMBAT_TASKS":
      return { ...state, allCombatTasks: action.payload };
    case "SET_ALL_DIARY_TASKS":
      return { ...state, allDiaryTasks: action.payload };
    case "SET_PLAYER_COMBAT_TASKS":
      return { ...state, playerCombatTasks: action.payload };
    case "SET_PLAYER_DIARY_TASKS":
      return { ...state, playerDiaryTasks: action.payload };
    case "SET_PLAYER_DATA":
      return { ...state, playerData: action.payload };
    case "SET_USERNAME":
      return { ...state, username: action.payload };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_BASE_DATA_LOADED":
      return { ...state, baseDataLoaded: action.payload };
    case "SET_SHOW_COMBAT_LIST":
      return { ...state, showCombatList: action.payload };
    case "SET_SCROLL_TO_TIER":
      return { ...state, scrollToTier: action.payload };
    case "SET_SHOW_ACHIEVEMENT_LIST":
      return { ...state, showAchievementList: action.payload };
    case "SET_SCROLL_TO_REGION":
      return { ...state, scrollToRegion: action.payload };
    case "RESET_STATE":
      return initialState;
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  actions: {
    setUsername: (username: string) => void;
    loadPlayerData: (username: string) => Promise<void>;
    resetState: () => void;
    showCombatList: (tier?: string) => void;
    hideCombatList: () => void;
    showAchievementList: (region?: string) => void;
    hideAchievementList: () => void;
  };
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // On mount, load all tasks
  useEffect(() => {
    (async () => {
      dispatch({ type: "SET_LOADING", payload: true });
      try {
        const [combat, diary] = await Promise.all([
          scrapeWikiCombatAchievementTasks(),
          scrapeWikiAchievementDiaryTasks(),
        ]);
        dispatch({ type: "SET_ALL_COMBAT_TASKS", payload: combat });
        dispatch({ type: "SET_ALL_DIARY_TASKS", payload: diary });
        dispatch({ type: "SET_BASE_DATA_LOADED", payload: true });
      } catch (error) {
        dispatch({ type: "SET_ERROR", payload: "Failed to load base tasks" });
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    })();
  }, []);

  const actions = {
    setUsername: (username: string) => {
      dispatch({ type: "SET_USERNAME", payload: username });
    },
    resetState: () => {
      dispatch({ type: "RESET_STATE" });
    },
    loadPlayerData: async (username: string) => {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });
      try {
        const playerData = await fetchWikiPlayerData(username);
        dispatch({ type: "SET_PLAYER_DATA", payload: playerData });
        // Compute completed tasks for this player
        const playerCombat = await checkCompletedCombatAchievements(
          state.allCombatTasks,
          playerData,
        );
        const playerDiary = await checkCompletedAchievementDiaries(
          state.allDiaryTasks,
          playerData,
        );
        dispatch({ type: "SET_PLAYER_COMBAT_TASKS", payload: playerCombat });
        dispatch({ type: "SET_PLAYER_DIARY_TASKS", payload: playerDiary });
      } catch (error) {
        dispatch({ type: "SET_ERROR", payload: "Failed to load player data" });
        dispatch({ type: "SET_PLAYER_DATA", payload: null });
        dispatch({ type: "SET_PLAYER_COMBAT_TASKS", payload: [] });
        dispatch({ type: "SET_PLAYER_DIARY_TASKS", payload: [] });
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    showCombatList: (tier?: string) => {
      dispatch({ type: "SET_SHOW_COMBAT_LIST", payload: true });
      dispatch({ type: "SET_SCROLL_TO_TIER", payload: tier });
    },
    hideCombatList: () => {
      dispatch({ type: "SET_SHOW_COMBAT_LIST", payload: false });
      dispatch({ type: "SET_SCROLL_TO_TIER", payload: null });
    },
    showAchievementList: (region?: string) => {
      dispatch({ type: "SET_SHOW_ACHIEVEMENT_LIST", payload: true });
      dispatch({ type: "SET_SCROLL_TO_REGION", payload: region });
    },
    hideAchievementList: () => {
      dispatch({ type: "SET_SHOW_ACHIEVEMENT_LIST", payload: false });
      dispatch({ type: "SET_SCROLL_TO_REGION", payload: null });
    },
  };

  return (
    <AppContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}

export function usePlayerData() {
  const { state } = useApp();
  return {
    playerData: state.playerData,
    username: state.username,
    isLoading: state.isLoading,
    error: state.error,
  };
}

export function useCombatAchievements() {
  const { state } = useApp();
  // If no player data, return all tasks with no completion status
  if (!state.playerData) {
    return {
      combatAchievements: state.allCombatTasks,
      loaded: state.allCombatTasks.length > 0,
    };
  }
  return {
    combatAchievements: state.playerCombatTasks,
    loaded: state.playerCombatTasks.length > 0,
  };
}

export function useAchievementDiaries() {
  const { state } = useApp();
  // If no player data, return all tasks with no completion status
  if (!state.playerData) {
    return {
      achievementDiaries: state.allDiaryTasks,
      loaded: state.allDiaryTasks.length > 0,
    };
  }
  return {
    achievementDiaries: state.playerDiaryTasks,
    loaded: state.playerDiaryTasks.length > 0,
  };
}

// Normalization for combat achievement tiers
function normalizeTier(type: string): string {
  if (type.toLowerCase().includes("easy")) return "Easy";
  if (type.toLowerCase().includes("medium")) return "Medium";
  if (type.toLowerCase().includes("hard")) return "Hard";
  if (type.toLowerCase().includes("elite")) return "Elite";
  if (type.toLowerCase().includes("master")) return "Master";
  if (type.toLowerCase().includes("grandmaster")) return "Grandmaster";
  return type;
}

export function useCombatAchievementTierStats() {
  const { state } = useApp();
  const { combatAchievements } = useCombatAchievements();
  const hasPlayerData = !!state.playerData;

  // Map points to tier names
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

  const tierStats = combatAchievements.reduce((acc, achievement) => {
    const tier = getTierFromPoints(achievement.points);
    if (!acc[tier]) {
      acc[tier] = { completed: 0, total: 0, points: 0, totalPoints: 0 };
    }
    if (hasPlayerData && achievement.completed) {
      acc[tier].completed++;
      acc[tier].points += achievement.points;
    }
    acc[tier].total++;
    acc[tier].totalPoints += achievement.points;
    return acc;
  }, {} as Record<string, { completed: number; total: number; points: number; totalPoints: number }>);

  // Add completion rates
  const result: Record<
    string,
    {
      completed: number;
      total: number;
      points: number;
      totalPoints: number;
      completionRate: number;
    }
  > = {};
  Object.entries(tierStats).forEach(([tier, stats]) => {
    result[tier] = {
      ...stats,
      completionRate:
        stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
    };
  });

  return result;
}

export function useAchievementDiaryRegionStats() {
  const { state } = useApp();
  const { achievementDiaries } = useAchievementDiaries();
  const hasPlayerData = !!state.playerData;

  const regionStats = achievementDiaries.reduce((acc, achievement) => {
    const region = achievement.region;
    if (!acc[region]) {
      acc[region] = { completed: 0, total: 0 };
    }
    if (hasPlayerData && achievement.completed) {
      acc[region].completed++;
    }
    acc[region].total++;
    return acc;
  }, {} as Record<string, { completed: number; total: number }>);

  // Add completion rates
  const result: Record<
    string,
    {
      completed: number;
      total: number;
      completionRate: number;
    }
  > = {};
  Object.entries(regionStats).forEach(([region, stats]) => {
    result[region] = {
      ...stats,
      completionRate:
        stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
    };
  });

  return result;
}
