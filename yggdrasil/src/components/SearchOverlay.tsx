/**
 * SearchOverlay — toggled with `/`, dismissed with `Esc`.
 *
 * Lives over the tree canvas. As the user types, the parent
 * RunTab's searchQuery state updates and TreeCanvas dims any node
 * whose title/body doesn't contain the substring. Enter cycles
 * through matches; the parent centers the viewport on each one.
 */

import { useEffect, useMemo, useRef } from 'react';
import type { Tree } from '../api/types';
import './SearchOverlay.css';

interface Props {
  tree: Tree;
  open: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  onClose: () => void;
  onJumpTo: (nodeId: string) => void;
}

export function SearchOverlay({
  tree,
  open,
  query,
  onQueryChange,
  onClose,
  onJumpTo,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  /** ``total`` is the honest match count across the whole tree.
   * ``items`` is the slice the result list actually renders. The
   * earlier implementation conflated the two and lied about the
   * count whenever there were more than the display cap. */
  const { items, total } = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { items: [], total: 0 };
    const items: Array<{
      id: string;
      title: string;
      type: string;
      zone: string;
    }> = [];
    let total = 0;
    for (const node of Object.values(tree.nodes)) {
      const hay = (node.title + ' ' + (node.body ?? '')).toLowerCase();
      if (!hay.includes(q)) continue;
      total += 1;
      if (items.length < 10) {
        items.push({
          id: node.id,
          title: node.title,
          type: node.type,
          zone: node.zone,
        });
      }
    }
    return { items, total };
  }, [query, tree.nodes]);

  if (!open) return null;

  return (
    <div className="search-overlay">
      <div className="search-overlay__shell">
        <div className="search-overlay__field">
          <span className="search-overlay__prompt">/</span>
          <input
            ref={inputRef}
            className="search-overlay__input"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              } else if (e.key === 'Enter') {
                e.preventDefault();
                if (items.length > 0) {
                  onJumpTo(items[0].id);
                  onClose();
                }
              }
            }}
            placeholder="filter nodes by title / body…"
            spellCheck={false}
          />
          <span className="search-overlay__count">
            {query.trim()
              ? total > items.length
                ? `${items.length}/${total}`
                : `${total}`
              : ''}
          </span>
        </div>
        {items.length > 0 && (
          <ul className="search-overlay__results">
            {items.map((m) => (
              <li
                key={m.id}
                className="search-overlay__result"
                onClick={() => {
                  onJumpTo(m.id);
                  onClose();
                }}
              >
                <span className={`search-overlay__type search-overlay__type--${m.type}`}>
                  {m.type.replaceAll('_', ' ')}
                </span>
                <span className={`search-overlay__zone search-overlay__zone--${m.zone}`}>
                  {m.zone}
                </span>
                <span className="search-overlay__title">{m.title}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="search-overlay__hint">
          enter to jump · esc to close
        </div>
      </div>
    </div>
  );
}
