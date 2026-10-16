import { useEffect, useRef, useState } from "react";
import { SearchSelect } from "./SearchSelect.jsx";

const CMS_API = import.meta.env.VITE_CMS_API || "http://localhost:4000/api/v1";

// Shared loader for the geographical masters.
//
// One request per master (and per parent), shared by every dropdown on the
// page, so the Vargs and Contacts editors do not each refetch the district
// list. Entries are cached for the life of the page; masters change rarely and
// a reload picks up edits.
const cache = new Map();
const inFlight = new Map();

function load(master, parentColumn, parentId) {
  const key = parentId ? `${master}:${parentId}` : master;
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  if (inFlight.has(key)) return inFlight.get(key);

  const qs = parentId ? `?${parentColumn}=${parentId}` : "";
  // Deliberately given no AbortSignal. This promise is shared by every dropdown
  // asking for the same master, so letting one consumer cancel it cancels it
  // for all of them: under StrictMode's mount → cleanup → mount, the first
  // mount's abort killed the request and the second mount was handed that same
  // already-rejected promise, leaving the field on "Loading…" for good. A
  // consumer that no longer wants the answer ignores it via `ticket` below
  // instead of cancelling shared work.
  const req = fetch(`${CMS_API}/public/masters/${master}${qs}`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then(({ data }) => {
      const rows = Array.isArray(data) ? data : [];
      cache.set(key, rows);
      return rows;
    })
    .finally(() => inFlight.delete(key));

  inFlight.set(key, req);
  return req;
}

export function clearGeoCache() {
  cache.clear();
}

// Rows of one master, optionally filtered by a parent id.
//
// Returns { rows, loading, error, retry }. While `parentColumn` is set and no
// `parentId` is given the list stays empty — a dependent dropdown has nothing
// to show until its parent is chosen.
export function useGeo(master, parentColumn = null, parentId = null) {
  const [state, setState] = useState({ rows: [], loading: false, error: null });
  const [attempt, setAttempt] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    if (parentColumn && !parentId) {
      setState({ rows: [], loading: false, error: null });
      return undefined;
    }

    const ticket = ++latest.current;
    let active = true;
    setState((s) => ({ ...s, loading: true, error: null }));

    load(master, parentColumn, parentId)
      .then((rows) => {
        // A slower earlier request must not overwrite a newer selection.
        if (active && ticket === latest.current) setState({ rows, loading: false, error: null });
      })
      .catch((err) => {
        if (!active || ticket !== latest.current) return;
        setState({ rows: [], loading: false, error: err.message || "Could not load" });
      });

    return () => { active = false; };
  }, [master, parentColumn, parentId, attempt]);

  return { ...state, retry: () => setAttempt((a) => a + 1) };
}

// A <select> over one master, valued by Marathi name — the form's existing
// contract — not by id.
//
// A stored value the master no longer offers (renamed, deactivated, or typed in
// before these tables existed) is kept as an extra option so editing a historic
// record never silently blanks its geography.
export function GeoSelect({
  master, parentColumn = null, parentId = null,
  value, onChange, onResolve,
  required, disabled, placeholder = "Select…", id, className = "a-input",
  // Opt-in, so every existing caller keeps the native <select> it was written
  // against. Worth turning on where the list is long enough to scan badly —
  // thirty-six districts, for instance.
  searchable = false,
  waitingLabel = "Select the level above first",
  emptyLabel = "No active records — add one in Master Management.",
}) {
  const { rows, loading, error, retry } = useGeo(master, parentColumn, parentId);

  const known = rows.some((r) => r.name_mr === value);
  const waitingOnParent = Boolean(parentColumn) && !parentId;

  // Hand the matching row back so a caller can fill a sibling *_en field.
  useEffect(() => {
    if (!onResolve) return;
    onResolve(rows.find((r) => r.name_mr === value) ?? null);
  }, [rows, value, onResolve]);

  if (error) {
    return (
      <div className="a-geo-error">
        <span>Could not load {master}.</span>
        <button type="button" className="a-btn a-btn-ghost a-btn-sm" onClick={retry}>Retry</button>
      </div>
    );
  }

  if (searchable) {
    const options = rows.map((r) => ({
      value: r.name_mr,
      label: r.name_mr,
      secondary: r.name_en || "",
    }));
    // A historic or deactivated value stays selectable, exactly as it does in
    // the native path below.
    if (value && !known && !loading) {
      options.unshift({ value, label: value, secondary: "not in master" });
    }
    return (
      <>
        <SearchSelect
          id={id}
          options={options}
          value={value || ""}
          onChange={onChange}
          required={required}
          disabled={disabled || waitingOnParent}
          loading={loading}
          placeholder={waitingOnParent ? waitingLabel : placeholder}
          searchPlaceholder="Type to search…"
          emptyLabel="No matches"
        />
        {!loading && !waitingOnParent && rows.length === 0 && (
          <span className="a-field-help">{emptyLabel}</span>
        )}
        {value && !known && !loading && (
          <span className="a-field-help">
            This value is not in the master list. It is kept as saved; pick from the list to change it.
          </span>
        )}
      </>
    );
  }

  return (
    <>
      <select
        id={id}
        className={className}
        value={value || ""}
        required={required}
        disabled={disabled || loading || waitingOnParent}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">
          {waitingOnParent ? "Select the level above first" : loading ? "Loading…" : placeholder}
        </option>
        {/* Keeps a historic or deactivated value selectable. */}
        {value && !known && !loading && <option value={value}>{value} (not in master)</option>}
        {rows.map((r) => (
          <option key={r.id} value={r.name_mr}>
            {r.name_en ? `${r.name_mr} — ${r.name_en}` : r.name_mr}
          </option>
        ))}
      </select>
      {!loading && !waitingOnParent && rows.length === 0 && (
        <span className="a-field-help">No active records — add one in Master Management.</span>
      )}
      {value && !known && !loading && (
        <span className="a-field-help">
          This value is not in the master list. It is kept as saved; pick from the list to change it.
        </span>
      )}
    </>
  );
}

// Multi-select for the district_contacts districts array: checkboxes scoped to
// the chosen division. The submitted value stays an array of Marathi names.
export function GeoCheckList({ master, parentColumn, parentId, value = [], onChange }) {
  const { rows, loading, error, retry } = useGeo(master, parentColumn, parentId);

  if (error) {
    return (
      <div className="a-geo-error">
        <span>Could not load {master}.</span>
        <button type="button" className="a-btn a-btn-ghost a-btn-sm" onClick={retry}>Retry</button>
      </div>
    );
  }
  if (!parentId) return <span className="a-field-help">Select a division first.</span>;
  if (loading) return <span className="a-field-help">Loading…</span>;

  // Names saved under this contact that the filtered list does not offer.
  const extras = value.filter((n) => !rows.some((r) => r.name_mr === n));

  const toggle = (name, on) =>
    onChange(on ? [...value, name] : value.filter((n) => n !== name));

  if (rows.length === 0 && extras.length === 0) {
    return <span className="a-field-help">No active districts in this division.</span>;
  }

  return (
    <div className="a-geo-checklist">
      {rows.map((r) => (
        <label key={r.id} className="a-checkbox-label">
          <input
            type="checkbox"
            className="a-checkbox"
            checked={value.includes(r.name_mr)}
            onChange={(e) => toggle(r.name_mr, e.target.checked)}
          />
          {r.name_mr}
        </label>
      ))}
      {extras.map((n) => (
        <label key={n} className="a-checkbox-label is-foreign" title="Saved previously; not in this division">
          <input
            type="checkbox"
            className="a-checkbox"
            checked
            onChange={() => toggle(n, false)}
          />
          {n} (not in this division)
        </label>
      ))}
    </div>
  );
}
