/**
 * Player data obtained from the WikiSync plugin on Runelite.
 * https://sync.runescape.wiki/runelite/player/USERNAME/STANDARD
 */
export interface WikiPlayerData {
  // The username of the player.
  username: string;
  // The timestamp that data was last synced from the player's runelite to wikisync.
  timestamp: string;
  // A map of quest names to the number of quest points (0-5) (0 for incomplete)
  quests: {
    [questName: string]: number;
  };
  // A map of achievement diaries with each task corresponding to an ID.
  achievement_diaries: {
    [regionName: string]: {
      Easy: {
        complete: boolean;
        tasks: boolean[];
      };
      Medium: {
        complete: boolean;
        tasks: boolean[];
      };
      Hard: {
        complete: boolean;
        tasks: boolean[];
      };
      Elite: {
        complete: boolean;
        tasks: boolean[];
      };
    };
  };
  // A map of the music tracks the player has completed.
  music_tracks: {
    [trackName: string]: boolean;
  };
  // An array of combat achievement ids that the player has completed.
  combat_achievements: number[];
  // An array of collection log item ids that the player has completed.
  collection_log: number[];
  // The number of collection log items in the game (or null if log not synced).
  collectionLogItemCount: number | null;
}

/**
 * An individual combat achievement task.
 * Each task's data is scraped from the
 * oldschool wiki tables.
 */
export interface WikiCombatAchievementTask {
  // The id (number) of the combat achievement task.
  id: number;
  // The name of the combat achievement task.
  name: string;
  // The monster that the combat achievement is for.
  monster: string;
  // The description of the combat achievement.
  description: string;
  // The type of combat achievement.
  type: string;
  // The number of points the CA offers.
  points: number;
  // A link to this combat task on the Wiki.
  link: string;
  // Whether the combat achievement has been completed by the player.
  // This is not present on any CA's until `checkPlayerCACompletions` is run.
  completed?: boolean;
}

/**
 * An individual combat achievement task.
 * Each task's data is scraped from the
 * oldschool wiki tables.
 */
export interface WikiAchievementDiaryTask {
  // The region of the achievement diary task.
  region: string;
  // The description of the achievement diary task.
  description: string;
  // The difficulty tier of the achievement diary task.
  difficulty: "Easy" | "Medium" | "Hard" | "Elite";
  // A link to this achievement diary task on the Wiki.
  link: string;
  // Whether the achievement diary task has been completed by the player.
  completed?: boolean;
}

// Hard-coded values that will probably not need to be updated for a very long time.
export const BASE_WIKI_URL = "https://oldschool.runescape.wiki/w/";
export const ACHIEVEMENT_DIFFICULTY_TIERS = [
  "Easy",
  "Medium",
  "Hard",
  "Elite",
] as const;

// Cache utilities
interface CacheEntry<T> {
  data: T;
  timestamp: string;
  date: string;
}

const CACHE_KEYS = {
  COMBAT_TASKS: "runeprofile_combat_tasks_cache",
  DIARY_TASKS: "runeprofile_diary_tasks_cache",
} as const;

function getTodayString(): string {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
}

function isCacheValid<T>(cacheEntry: CacheEntry<T> | null): boolean {
  if (!cacheEntry) return false;
  return cacheEntry.date === getTodayString();
}

function getCachedData<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const cacheEntry: CacheEntry<T> = JSON.parse(cached);
    if (!isCacheValid(cacheEntry)) {
      localStorage.removeItem(key);
      return null;
    }

    return cacheEntry.data;
  } catch (error) {
    console.warn(`Failed to read cache for ${key}:`, error);
    localStorage.removeItem(key);
    return null;
  }
}

function setCachedData<T>(key: string, data: T): void {
  try {
    const cacheEntry: CacheEntry<T> = {
      data,
      timestamp: new Date().toISOString(),
      date: getTodayString(),
    };
    localStorage.setItem(key, JSON.stringify(cacheEntry));
  } catch (error) {
    console.warn(`Failed to write cache for ${key}:`, error);
  }
}

// Cache management functions
export function clearAllCache(): void {
  try {
    Object.values(CACHE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
    console.log("Cleared all cached data");
  } catch (error) {
    console.warn("Failed to clear cache:", error);
  }
}

export function getCacheStatus(): {
  combatTasks: boolean;
  diaryTasks: boolean;
  lastUpdated?: string;
} {
  const combatCached = getCachedData(CACHE_KEYS.COMBAT_TASKS) !== null;
  const diaryCached = getCachedData(CACHE_KEYS.DIARY_TASKS) !== null;

  let lastUpdated: string | undefined;
  try {
    const combatEntry = localStorage.getItem(CACHE_KEYS.COMBAT_TASKS);
    if (combatEntry) {
      const parsed = JSON.parse(combatEntry) as CacheEntry<any>;
      lastUpdated = parsed.timestamp;
    }
  } catch (error) {
    console.warn("Failed to get cache timestamp:", error);
  }

  return {
    combatTasks: combatCached,
    diaryTasks: diaryCached,
    lastUpdated,
  };
}

/**
 * Scrapes the oldschool wiki & returns an array of all achievement diary tasks.
 * Only needs to be run once at build time (or whenever game adds new regions/tasks).
 * Now uses localStorage caching with daily expiration.
 *
 * @returns WikiAchievementDiaryTask[]
 */
export const scrapeWikiAchievementDiaryTasks = async (): Promise<
  WikiAchievementDiaryTask[]
> => {
  // Check cache first
  const cached = getCachedData<WikiAchievementDiaryTask[]>(
    CACHE_KEYS.DIARY_TASKS,
  );
  if (cached) {
    console.log("Using cached achievement diary tasks");
    return cached;
  }

  console.log("Scraping achievement diary tasks from wiki...");
  const tasks: WikiAchievementDiaryTask[] = [];
  const ACHIEVEMENT_DIARY_URL = BASE_WIKI_URL + "Achievement_Diary";

  // (1) Fetch the achievement diary page.
  const response = await fetch(ACHIEVEMENT_DIARY_URL);
  const html = await response.text();

  // (2) Match the first table in the page that contains the list of regions.
  const tableMatch = html.match(
    /<table[^>]*>[\s\S]*?Ardougne Diary[\s\S]*?<\/table>/i,
  );
  if (!tableMatch) {
    throw new Error("Achievement diary regions table not found");
  }
  const regionsTableHTML = tableMatch[0];

  // (3) Parse the table into an array of regions.
  const regions: string[] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  let isFirstRow = true;
  while ((rowMatch = rowRegex.exec(regionsTableHTML))) {
    if (isFirstRow) {
      isFirstRow = false;
      continue;
    }
    const rowHTML = rowMatch[1];
    const cellMatches = [...rowHTML.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
    if (cellMatches.length > 0) {
      const clean = (html: string) =>
        html
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;|&#160;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/\s+/g, " ")
          .trim();

      const regionName = clean(cellMatches[0][1]);
      if (regionName) {
        regions.push(regionName);
      }
    }
  }

  // (4) For each region, fetch the region page & parse difficulty tables into tasks.
  for (const region of regions) {
    const regionURL = `${BASE_WIKI_URL}${region}?action=render`;
    const regionResponse = await fetch(regionURL);
    const regionHTML = await regionResponse.text();
    // Match tables for each difficulty tier

    for (const tier of ACHIEVEMENT_DIFFICULTY_TIERS) {
      const tableRegex = new RegExp(
        `<table[^>]*data-diary-tier="${tier}"[^>]*>([\\s\\S]*?)</table>`,
        "i",
      );
      const tableMatch = regionHTML.match(tableRegex);
      if (tableMatch) {
        const tableHTML = tableMatch[1];

        // Parse each row in the table
        const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let rowMatch: RegExpExecArray | null;
        let isFirstRow = true;

        while ((rowMatch = rowRegex.exec(tableHTML))) {
          if (isFirstRow) {
            isFirstRow = false;
            continue; // Skip header row
          }

          const rowHTML = rowMatch[1];
          const cellMatches = [
            ...rowHTML.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi),
          ];

          if (cellMatches.length > 0) {
            const clean = (html: string) =>
              html
                .replace(/<[^>]+>/g, "")
                .replace(/&nbsp;|&#160;/g, " ")
                .replace(/&amp;/g, "&")
                .replace(/\s+/g, " ")
                .trim();

            const description = clean(cellMatches[0][1]);
            // Filter the description so that it removes the starting 1., 2., etc.
            // It only removes the starting list number (can be double digit).
            const descriptionWithoutNumber = description.replace(
              /^[1-9][0-9]*\. /,
              "",
            );
            if (descriptionWithoutNumber) {
              const task: WikiAchievementDiaryTask = {
                region: region,
                description: descriptionWithoutNumber,
                difficulty: tier,
                link: `${BASE_WIKI_URL}${encodeURI(region)}#${tier}`,
              };
              tasks.push(task);
            }
          }
        }
      }
    }
  }

  // Cache the results
  setCachedData(CACHE_KEYS.DIARY_TASKS, tasks);
  console.log(`Cached ${tasks.length} achievement diary tasks`);

  return tasks;
};

/**
 * Scrapes the oldschool wiki & returns an array of all combat achievement tasks.
 * Only needs to be run once at build time (or whenever game adds new bosses/tasks).
 * Now uses localStorage caching with daily expiration.
 *
 * @returns WikiCombatAchievementTask[]
 */
export const scrapeWikiCombatAchievementTasks = async (): Promise<
  WikiCombatAchievementTask[]
> => {
  // Check cache first
  const cached = getCachedData<WikiCombatAchievementTask[]>(
    CACHE_KEYS.COMBAT_TASKS,
  );
  if (cached) {
    console.log("Using cached combat achievement tasks");
    return cached;
  }

  console.log("Scraping combat achievement tasks from wiki...");
  const tasks: WikiCombatAchievementTask[] = [];
  const COMBAT_ACHIEVEMENTS_URL =
    BASE_WIKI_URL + "Combat_Achievements/All_tasks?action=render";
  const response = await fetch(COMBAT_ACHIEVEMENTS_URL);
  const html = await response.text();

  // Match the ca-tasks table
  const tableMatch = html.match(
    /<table[^>]*class="[^"]*ca-tasks[^"]*"[^>]*>([\s\S]*?)<\/table>/i,
  );
  if (!tableMatch) throw new Error("ca-tasks table not found");
  const tableHTML = tableMatch[0];

  // Match all <tr> rows with a data-ca-task-id attribute
  const rowRegex = /<tr[^>]*data-ca-task-id="(\d+)"[^>]*>([\s\S]*?)<\/tr>/gi;
  let match: RegExpExecArray | null;

  while ((match = rowRegex.exec(tableHTML))) {
    const caID = Number(match[1]);
    const rowHTML = match[2];

    const cellMatches = [...rowHTML.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];

    if (cellMatches.length >= 4) {
      const clean = (html: string) =>
        html
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;|&#160;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/\s+/g, " ")
          .trim();

      const monster = clean(cellMatches[0][1]);
      const name = clean(cellMatches[1][1]);
      const description = clean(cellMatches[2][1]);
      const type = clean(cellMatches[3][1]);
      const pointsStr = clean(cellMatches[4][1]);
      const pointsMatch = pointsStr.match(/\d+/);
      const points = pointsMatch ? Number(pointsMatch[0]) : 0;
      const link = `${BASE_WIKI_URL}${encodeURI(name)}`;
      tasks.push({ id: caID, link, name, monster, description, type, points });
    }
  }

  const sortedTasks = tasks.sort((a, b) => a.id - b.id);

  // Cache the results
  setCachedData(CACHE_KEYS.COMBAT_TASKS, sortedTasks);
  console.log(`Cached ${sortedTasks.length} combat achievement tasks`);

  return sortedTasks;
};

/**
 * Checks the given player's completed combat achievements
 * and returns the modified combat achievement task array.
 *
 * @param t - All combat achievement tasks.
 * @param p - The player's wikisync data.
 * @returns WikiCombatAchievementTask[]
 */
export const checkCompletedCombatAchievements = async (
  t: WikiCombatAchievementTask[],
  p: WikiPlayerData,
): Promise<WikiCombatAchievementTask[]> => {
  const completedSet = new Set(p.combat_achievements);
  for (let i = 0; i < t.length; i++) {
    t[i].completed = completedSet.has(i);
  }
  return t;
};

/**
 * Checks the given player's completed achievement diaries
 * and returns the modified achievement diary task array.
 *
 * @param t - All achievement diary tasks.
 * @param p - The player's wikisync data.
 * @returns WikiCombatAchievementTask[]
 */
export const checkCompletedAchievementDiaries = async (
  t: WikiAchievementDiaryTask[],
  p: WikiPlayerData,
): Promise<WikiAchievementDiaryTask[]> => {
  // (1) Loop through tasks to get all regions.
  const regions = t
    .map((t) => t.region)
    .filter((r, i, a) => a.indexOf(r) === i)
    .map((r) => r.replace(" Diary", ""));

  // (2) Break into regional & difficulty groups
  const groups: {
    [regiondiff: string]: WikiAchievementDiaryTask[];
  } = {};
  for (let i = 0; i < t.length; i++) {
    const task = t[i];
    const region = task.region.replace(" Diary", "");
    const difficulty = task.difficulty;
    groups[`${region}-${difficulty}`] = [
      ...(groups[`${region}-${difficulty}`] || []),
      task,
    ];
  }

  // (3) Loop through each group & check if the player has completed the tasks.
  const keys = Object.keys(groups);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const [region, difficulty] = key.split("-");
    const group = groups[key];
    for (let i = 0; i < group.length; i++) {
      const task = group[i];
      const completed = p.achievement_diaries[region][difficulty].tasks[i];
      task.completed = completed;
    }
  }
  // (3) Return the modified tasks.
  return Object.values(groups).flat();
};

/**
 * Fetches the player's data from the wiki sync plugin API.
 */
export const fetchWikiPlayerData = async (
  username: string,
): Promise<WikiPlayerData> => {
  const URL = `https://sync.runescape.wiki/runelite/player/${username}/STANDARD`;
  try {
    const response = await fetch(URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; RuneProfileBot/1.0; +https://runeprofile.com/)",
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data as WikiPlayerData;
  } catch (error) {
    console.error(`Error fetching combat achievements for ${username}:`, error);
    throw error;
  }
};
