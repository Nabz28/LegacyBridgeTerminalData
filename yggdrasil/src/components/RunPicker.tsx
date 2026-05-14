import type { RunIndexEntry } from "../lib/types";

interface Props {
  runs: RunIndexEntry[];
  selectedRunDir: string | null;
  onSelect: (runDirName: string) => void;
}

/**
 * Dropdown listing every run in the snapshot. Newest first (the
 * snapshot already sorts by created_at descending). Topic + node
 * count + run_id-prefix shown so two runs of the same topic stay
 * distinguishable.
 */
export function RunPicker({ runs, selectedRunDir, onSelect }: Props) {
  if (runs.length === 0) {
    return (
      <div className="run-picker run-picker--empty">
        No runs in this snapshot. Run <code>yggdrasil run new …</code>
        {" "}then <code>yggdrasil viz dump</code>.
      </div>
    );
  }

  return (
    <label className="run-picker">
      <span className="run-picker__label">Run</span>
      <select
        className="run-picker__select"
        value={selectedRunDir ?? ""}
        onChange={(e) => onSelect(e.target.value)}
      >
        {selectedRunDir === null && <option value="">Select a run…</option>}
        {runs.map((run) => {
          const idTag = run.run_id ? run.run_id.slice(0, 8) : "noid";
          const count = run.node_count ?? 0;
          return (
            <option key={run.run_dir_name} value={run.run_dir_name}>
              {run.topic ?? run.run_dir_name} — {count} nodes — {idTag}
            </option>
          );
        })}
      </select>
    </label>
  );
}
