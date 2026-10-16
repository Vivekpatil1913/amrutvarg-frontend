import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";

// A single-choice dropdown you can type into.
//
// Built here rather than pulled in: this admin has no component library, and a
// list of thirty-six districts in Marathi is exactly the case a native
// <select> handles badly — its type-ahead matches only the start of an option
// and only in bursts, which is no use when the reader knows the middle of a
// name or is searching in the other language.
//
// It follows the ARIA combobox pattern, so it behaves the way a keyboard user
// expects: ↑/↓ move through the options, Enter picks the active one, Escape
// closes without changing anything, Home/End jump to the ends, and Tab leaves
// the field as it found it. The hidden text input carries the current value
// for a native form submit and for `required`, so the field participates in
// validation exactly as the <select> it replaces did.
export function SearchSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Type to search…",
  emptyLabel = "No matches",
  disabled,
  loading,
  required,
  id,
  name,
  clearable = true,
  describedBy,
}) {
  const reactId = useId();
  const listId = `${id || reactId}-listbox`;
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [active, setActive] = useState(0);
  // Measured when the list opens; see the placement effect below.
  const [placement, setPlacement] = useState({ flip: false, maxHeight: 240 });

  const wrapRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  );

  // Matches anywhere in either label, not just the start — the whole reason
  // this exists.
  const matches = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) =>
      `${o.label} ${o.secondary ?? ""}`.toLowerCase().includes(q)
    );
  }, [options, filter]);

  // Opening lands on the current choice rather than the top of the list.
  useEffect(() => {
    if (!open) return;
    const at = matches.findIndex((o) => o.value === value);
    setActive(at >= 0 ? at : 0);
    // Focus moves to the search box, so typing filters immediately.
    const frame = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Clicking away or pressing Escape closes it; neither changes the value.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) close();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Where the list goes, and how tall it may be.
  //
  // A field near the foot of the page would otherwise drop its list below the
  // fold, and on a short screen — a phone in landscape, a laptop with the
  // browser bars showing — there may not be room either way. So the side with
  // more room wins, and the list is capped to what that side actually has.
  // Recomputed on scroll and resize, because both move the field.
  useEffect(() => {
    if (!open) return undefined;
    const measure = () => {
      const box = wrapRef.current?.getBoundingClientRect();
      if (!box) return;
      const GAP = 8;
      const below = window.innerHeight - box.bottom - GAP;
      const above = box.top - GAP;
      // Below unless above is genuinely roomier — a list that opens downwards
      // is what a reader expects, and flipping without cause is disorienting.
      const flip = below < 200 && above > below;
      setPlacement({
        flip,
        // Never taller than the room available, and never a useless sliver.
        maxHeight: Math.max(140, Math.min(320, flip ? above : below)),
      });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open]);

  // Keeps the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function close() {
    setOpen(false);
    setFilter("");
  }

  function pick(option) {
    if (!option) return;
    onChange(option.value);
    close();
  }

  function onKeyDown(e) {
    if (disabled) return;
    if (!open) {
      if (["ArrowDown", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => Math.min(i + 1, matches.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(matches.length - 1);
        break;
      case "Enter":
        e.preventDefault();
        pick(matches[active]);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        close();
        break;
      default:
        break;
    }
  }

  const label = loading ? "Loading…" : selected?.label ?? "";

  return (
    <div className={`a-ssel${disabled ? " is-disabled" : ""}`} ref={wrapRef}>
      {/* Carries the value for native form validation, exactly as the <select>
          it replaces did. Focusable so `required` can report on it. */}
      <input
        type="text"
        className="a-ssel__value"
        id={id}
        name={name}
        value={value || ""}
        required={required}
        disabled={disabled}
        readOnly
        tabIndex={-1}
        aria-hidden="true"
      />

      <button
        type="button"
        className="a-ssel__control"
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        aria-describedby={describedBy}
      >
        <span className={`a-ssel__label${label ? "" : " is-placeholder"}`}>
          {label || placeholder}
        </span>
        {clearable && selected && !disabled && (
          <span
            className="a-ssel__clear"
            role="button"
            tabIndex={-1}
            aria-label="Clear selection"
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
          >
            <X size={14} />
          </span>
        )}
        <ChevronDown className="a-ssel__caret" size={16} aria-hidden="true" />
      </button>

      {open && (
        <div className={`a-ssel__panel${placement.flip ? " is-above" : ""}`}>
          <div className="a-ssel__search">
            <Search size={14} aria-hidden="true" />
            <input
              ref={searchRef}
              type="text"
              value={filter}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              aria-controls={listId}
              aria-autocomplete="list"
              onChange={(e) => { setFilter(e.target.value); setActive(0); }}
              onKeyDown={onKeyDown}
            />
          </div>

          <ul
            className="a-ssel__list"
            id={listId}
            role="listbox"
            ref={listRef}
            style={{ maxHeight: placement.maxHeight }}
          >
            {matches.length === 0 && (
              <li className="a-ssel__empty" role="presentation">{emptyLabel}</li>
            )}
            {matches.map((o, i) => (
              <li
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                data-active={i === active}
                className={`a-ssel__option${o.value === value ? " is-selected" : ""}${i === active ? " is-active" : ""}`}
                // mousedown rather than click: the outside-click handler fires
                // on mousedown and would close the panel first.
                onMouseDown={(e) => { e.preventDefault(); pick(o); }}
                onMouseEnter={() => setActive(i)}
              >
                <span>{o.label}</span>
                {o.secondary && <span className="a-ssel__secondary">{o.secondary}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default SearchSelect;
