/**
 * App — top-level shell. Composes tab strip, command bar, active tab
 * content, and status bar inside a CSS-grid layout.
 */

import { CommandBar } from './components/CommandBar';
import { StatusBar } from './components/StatusBar';
import { TabStrip } from './components/TabStrip';
import { useTabsStore } from './state/tabs';
import { HomeTab } from './tabs/HomeTab';
import { RunTab } from './tabs/RunTab';
import { TasksTab } from './tabs/TasksTab';

export function App() {
  const tabs = useTabsStore((s) => s.tabs);
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0] ?? null;

  return (
    <div className="app-shell">
      <TabStrip />
      <CommandBar />
      <main style={{ minHeight: 0, position: 'relative', overflow: 'hidden' }}>
        {activeTab?.kind === 'home' && <HomeTab />}
        {activeTab?.kind === 'run' && activeTab.runDirName && (
          <RunTab key={activeTab.id} runDirName={activeTab.runDirName} />
        )}
        {activeTab?.kind === 'tasks' && activeTab.runDirName && (
          <TasksTab key={activeTab.id} runDirName={activeTab.runDirName} />
        )}
      </main>
      <StatusBar />
    </div>
  );
}
