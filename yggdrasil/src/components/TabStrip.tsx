/**
 * Tab strip — Chrome-style tabs, middle-click to close, click to
 * activate. Lives at the top of the app shell.
 */

import { useTabsStore } from '../state/tabs';
import './TabStrip.css';

export function TabStrip() {
  const tabs = useTabsStore((s) => s.tabs);
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const activateTab = useTabsStore((s) => s.activateTab);
  const closeTab = useTabsStore((s) => s.closeTab);
  const openHomeTab = useTabsStore((s) => s.openHomeTab);

  return (
    <div className="tab-strip">
      <a
        className="tab-strip__home"
        href="/launcher/"
        title="Back to terminal selector"
        aria-label="Main terminal"
        onClick={(e) => {
          // Embedded in the launcher shell → ask the parent to go Home rather
          // than loading /launcher/ INTO this iframe (which nests a 2nd shell).
          if (window.top !== window.self) {
            e.preventDefault();
            try { window.top?.postMessage({ type: 'lbc:home' }, window.location.origin); } catch { /* noop */ }
          }
        }}
      >
        <span className="tab-strip__home-arrow">←</span>
        <span className="tab-strip__home-label">HOME</span>
      </a>
      <div className="tab-strip__brand">YGG</div>
      <div className="tab-strip__tabs">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={
              'tab' +
              (tab.id === activeTabId ? ' tab--active' : '') +
              (tab.kind === 'home' ? ' tab--home' : '')
            }
            onClick={() => activateTab(tab.id)}
            onMouseDown={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                closeTab(tab.id);
              }
            }}
            title={tab.title}
          >
            <span className="tab__title">{tab.title}</span>
            {tab.kind !== 'home' && (
              <button
                className="tab__close"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                aria-label={`Close ${tab.title}`}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          className="tab-strip__new"
          onClick={openHomeTab}
          title="Open home (new tab launcher)"
        >
          +
        </button>
      </div>
    </div>
  );
}
