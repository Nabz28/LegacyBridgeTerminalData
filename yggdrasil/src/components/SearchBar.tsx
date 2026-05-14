import { useEffect, useState } from "react";

interface Props {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}

/**
 * Debounced search input. Updates the parent state ~150ms after
 * typing stops so layout/highlight passes don't run on every keystroke.
 */
export function SearchBar({ value, onChange, placeholder }: Props) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (draft !== value) onChange(draft);
    }, 150);
    return () => window.clearTimeout(handle);
  }, [draft, value, onChange]);

  return (
    <label className="search-bar">
      <span className="search-bar__label">Search</span>
      <input
        type="search"
        className="search-bar__input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder ?? "Filter nodes by title…"}
      />
      {draft && (
        <button
          type="button"
          className="search-bar__clear"
          onClick={() => {
            setDraft("");
            onChange("");
          }}
          aria-label="Clear search"
        >
          ×
        </button>
      )}
    </label>
  );
}
