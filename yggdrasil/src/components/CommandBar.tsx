/**
 * Command bar — top of the app, below the tab strip.
 *
 * Sprint 7: visual placeholder only. The command parser lands in
 * Sprint 9. Today it shows the prompt + a hint about ⌘K.
 */

import './CommandBar.css';

export function CommandBar() {
  return (
    <div className="command-bar">
      <span className="command-bar__prompt">&gt;</span>
      <input
        className="command-bar__input"
        placeholder="command bar — Sprint 9 lands the parser; for now use the home tab"
        disabled
        spellCheck={false}
      />
      <span className="command-bar__hint">⌘K palette · Sprint 9</span>
    </div>
  );
}
