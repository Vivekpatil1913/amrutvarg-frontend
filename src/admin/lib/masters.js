// Shape of the four geography masters, shared by the list screen and the
// add/edit page. Mirrors the backend's masters.config.js.
export const MASTER_UI = {
  states: {
    key: "states", label: "State", plural: "States",
    desc: "States the programme operates in",
    parent: null, codeRequired: true, child: "Vibhags",
  },
  vibhags: {
    key: "vibhags", label: "Vibhag", plural: "Vibhags",
    desc: "Revenue divisions within a state",
    parent: { key: "states", column: "state_id", label: "State" },
    codeRequired: false, child: "Districts",
  },
  districts: {
    key: "districts", label: "District", plural: "Districts",
    desc: "Districts within a vibhag",
    parent: { key: "vibhags", column: "vibhag_id", label: "Vibhag" },
    grand: { key: "states", column: "state_id", label: "State" },
    codeRequired: false, child: "Talukas",
  },
  talukas: {
    key: "talukas", label: "Taluka", plural: "Talukas",
    desc: "Talukas within a district",
    parent: { key: "districts", column: "district_id", label: "District" },
    grand: { key: "vibhags", column: "vibhag_id", label: "Vibhag" },
    codeRequired: false, child: null,
  },
};

// Levels the editor asks for, outermost first. Only the LAST entry is stored on
// the record; the ones above it exist to narrow the list below, so adding a
// district means choosing State then Vibhag, and a taluka State, Vibhag then
// District.
export const CHAIN = {
  states: [],
  vibhags: [{ key: "states", column: "state_id", label: "State" }],
  districts: [
    { key: "states", column: "state_id", label: "State" },
    { key: "vibhags", column: "vibhag_id", label: "Vibhag" },
  ],
  talukas: [
    { key: "states", column: "state_id", label: "State" },
    { key: "vibhags", column: "vibhag_id", label: "Vibhag" },
    { key: "districts", column: "district_id", label: "District" },
  ],
};

export const emptyMaster = (cfg) => ({
  name_mr: "", name_en: "", code: "", former_names: [],
  is_active: true, display_order: 0,
  ...(cfg.parent ? { [cfg.parent.column]: "" } : {}),
});
