/**
 * HelpOverlay — keyboard cheat-sheet. Toggled with `?`.
 *
 * Static content; no state beyond the open flag held by RunTab.
 * Sprint-15 (accordion): drop the focus-mode hotkey, document the new
 * one-click-expands-children semantics, and the Esc-walks-back rule.
 */

import './HelpOverlay.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS: Array<{ keys: string; action: string }> = [
  { keys: 'click card', action: 'expand its children + select + open detail' },
  { keys: 'click same card', action: 'collapse its children' },
  { keys: 'click sibling', action: 'auto-collapses prior subtree (mutex per level)' },
  { keys: 'click cross-link badge', action: 'drill into the hidden target' },
  { keys: 'drag card', action: 'reposition (persisted)' },
  { keys: 'drag background', action: 'pan' },
  { keys: 'scroll', action: 'zoom (cursor-anchored)' },
  { keys: 'click minimap', action: 'jump + auto-expand path' },
  { keys: '/', action: 'search by title/body (jump + auto-expand)' },
  { keys: 'j / k', action: 'next / previous sibling' },
  { keys: 'h / l', action: 'parent / first child' },
  { keys: '↑ ↓ ← →', action: 'arrow keys also navigate' },
  { keys: 'esc', action: 'walk back one level (collapse deepest open)' },
  { keys: '0', action: 'fit-to-view' },
  { keys: '+ / -', action: 'zoom in / out' },
  { keys: 'r', action: 'reset card drag positions' },
  { keys: '?', action: 'toggle this help' },
];

export function HelpOverlay({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="help-overlay" onClick={onClose}>
      <div className="help-overlay__card" onClick={(e) => e.stopPropagation()}>
        <div className="help-overlay__head">
          <span className="help-overlay__title">KEYBOARD & MOUSE</span>
          <button className="help-overlay__close" onClick={onClose}>
            esc
          </button>
        </div>
        <div className="help-overlay__grid">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="help-overlay__row">
              <span className="help-overlay__keys">{s.keys}</span>
              <span className="help-overlay__action">{s.action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
