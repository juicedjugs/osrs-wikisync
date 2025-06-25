import { createRoot } from "react-dom/client";
import "./app.css";
import CombatOverview from "./components/CombatOverview";
import CombatList from "./components/CombatList";
import AchievementOverview from "./components/AchievementOverview";
import AchievementList from "./components/AchievementList";
import UserLookup from "./components/UserLookup";
import { AppProvider, useApp } from "./state";
// Adding comment to manually trigger rebuild.
console.log(new Date());
const CombatSection = () => {
  const { state } = useApp();
  const { showCombatList } = state;

  return (
    <div className="combat">
      {showCombatList ? <CombatList /> : <CombatOverview />}
    </div>
  );
};

const AchievementSection = () => {
  const { state } = useApp();
  const { showAchievementList } = state;

  return (
    <div className="achievement">
      {showAchievementList ? <AchievementList /> : <AchievementOverview />}
    </div>
  );
};

const App = () => {
  return (
    <AppProvider>
      <div>
        <UserLookup />
        <div className="sections">
          <CombatSection />
          <AchievementSection />
        </div>
      </div>
    </AppProvider>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
