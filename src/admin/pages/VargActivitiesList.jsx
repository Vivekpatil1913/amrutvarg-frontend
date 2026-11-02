import { useEffect, useState } from "react";
import { Download, Eye, EyeOff, Search, Trash2, ExternalLink, Image as ImageIcon } from "lucide-react";
import { useList, useMutation, useDebounce } from "../hooks/useApi.js";
import { api, buildQuery } from "../api/client.js";
import { DataTable } from "../components/ui/DataTable.jsx";
import { ConfirmModal } from "../components/ui/Modal.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { errorMessage } from "../lib/errors.js";
import { fmtStamp } from "../lib/roles.js";
import { useMaster } from "../../data/useMasters.js";
import { mediaSrc } from "../../services/mediaUrl.js";
import { FREQUENCY, exportFileName } from "../lib/vargActivities.js";

// Amrut Varg activity records filed from the public 'Amrut Varg' portal,
// confined by the CMS to the signed-in officer's jurisdiction. The export
// uses the same filters as the table, so the CSV holds exactly what is listed
// (every page of it).

const CMS_API = import.meta.env.VITE_CMS_API || "http://localhost:4000/api/v1";
const NUMBER_FORMAT = new Intl.NumberFormat("en-IN");

// The Amrut Varg Pramukh is always shown in bold red, with the role named.
function PramukhName({ name, compact = false }) {
  return (
    <span className="av-pramukh">
      <span className="av-pramukh-name">{name}</span>
      {!compact && <span className="av-pramukh-role">Amrut Varg Pramukh (प्रमुख)</span>}
    </span>
  );
}

export default function VargActivitiesList() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [frequency, setFrequency] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const debounced = useDebounce(search);
  const { mutate, loading: saving } = useMutation();

  const divisions = useMaster("vibhags");
  const districts = useMaster("districts", "vibhag_id", divisionId ? Number(divisionId) : null);

  const filters = { search: debounced, division_id: divisionId, district_id: districtId, frequency };
  const { data, meta, loading, error, refetch } = useList(
    "/admin/varg-activities",
    { page, limit, ...filters },
    [page, limit, debounced, divisionId, districtId, frequency]
  );
  // useList keeps only data and meta; the filtered totals are read alongside.
  const [summary, setSummary] = useState(null);
  const summaryQuery = buildQuery({ ...filters, limit: 1 });
  useEffect(() => {
    let alive = true;
    api.get(`/admin/varg-activities${summaryQuery}`)
      .then((res) => alive && setSummary(res.summary))
      .catch(() => alive && setSummary(null));
    return () => { alive = false; };
  }, [summaryQuery, data]);

  async function exportCsv() {
    setExporting(true);
    try {
      await api.download(`/admin/varg-activities/export.csv${buildQuery(filters)}`, exportFileName());
    } catch (err) {
      toast.error(errorMessage(err, "Could not export the CSV"));
    } finally {
      setExporting(false);
    }
  }

  async function toggleActive(row) {
    await mutate(async () => {
      await api.patch(`/admin/varg-activities/${row.id}`, { is_active: !row.is_active });
      toast.success(row.is_active ? "Hidden from the public repository" : "Shown in the public repository");
      refetch();
    }).catch((err) => toast.error(errorMessage(err, "Could not update that record")));
  }

  async function handleDelete() {
    await mutate(async () => {
      await api.del(`/admin/varg-activities/${confirmId}`);
      toast.success("Activity record deleted");
      setConfirmId(null);
      refetch();
    }).catch((err) => {
      setConfirmId(null);
      toast.error(errorMessage(err, "Could not delete that record"));
    });
  }

  const columns = [
    {
      key: "institution_name",
      label: "School / Institution",
      render: (v, row) => (
        <span>
          <span className="td-bold td-truncate" title={v}>{v}</span>
          <span className="a-text-muted a-text-sm">{[row.taluka, row.district_en || row.district_mr, row.division_en || row.division_mr].filter(Boolean).join(", ")}</span>
        </span>
      ),
    },
    {
      key: "incharge_name",
      label: "Pramukh (In-charge)",
      render: (v, row) => (
        <span>
          <PramukhName name={v} />
          {row.incharge_mobile ? <span className="a-text-muted a-text-sm">{row.incharge_mobile}</span> : null}
        </span>
      ),
    },
    { key: "participant_count", label: "Students", render: (v) => <strong>{NUMBER_FORMAT.format(v)}</strong> },
    { key: "frequency", label: "Frequency", render: (v) => <Badge tone={FREQUENCY[v]?.tone}>{FREQUENCY[v]?.label || v}</Badge> },
    {
      key: "photos",
      label: "Photos",
      render: (v) => (
        <span className="av-thumbs">
          {(Array.isArray(v) ? v : []).slice(0, 3).map((p) => {
            const src = mediaSrc(CMS_API, p.url);
            return src ? (
              <a key={p.url} href={src} target="_blank" rel="noopener noreferrer" title={p.originalName}>
                <img src={src} alt="" loading="lazy" />
              </a>
            ) : null;
          })}
          {Array.isArray(v) && v.length > 3 ? <span className="a-text-muted a-text-sm">+{v.length - 3}</span> : null}
          {!Array.isArray(v) || !v.length ? <ImageIcon size={14} /> : null}
        </span>
      ),
    },
    { key: "is_active", label: "Public", render: (v) => (v ? <Badge tone="ok">Shown</Badge> : <Badge tone="neutral">Hidden</Badge>) },
    { key: "created_at", label: "Submitted", render: (v) => fmtStamp(v) },
  ];

  const reset = (fn) => (e) => { fn(e.target.value); setPage(1); };

  const toolbar = (
    <>
      <div className="a-search-wrap">
        <Search className="a-search-icon" size={16} />
        <input className="a-search" placeholder="School, Pramukh, taluka…" value={search} onChange={reset(setSearch)} />
      </div>
      <select className="a-select" value={divisionId} onChange={(e) => { setDivisionId(e.target.value); setDistrictId(""); setPage(1); }}>
        <option value="">All divisions</option>
        {divisions.map((d) => <option key={d.id} value={d.id}>{d.name_en || d.name_mr}</option>)}
      </select>
      <select className="a-select" value={districtId} onChange={reset(setDistrictId)} disabled={!divisionId}>
        <option value="">All districts</option>
        {districts.map((d) => <option key={d.id} value={d.id}>{d.name_en || d.name_mr}</option>)}
      </select>
      <select className="a-select" value={frequency} onChange={reset(setFrequency)}>
        <option value="">Any frequency</option>
        {Object.entries(FREQUENCY).map(([value, f]) => <option key={value} value={value}>{f.label}</option>)}
      </select>
      <div className="a-toolbar-right">
        <a className="a-btn a-btn-secondary" href="/amrut-varg" target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> Public page</a>
        <button className="a-btn a-btn-primary" onClick={exportCsv} disabled={exporting}>
          <Download size={15} /> {exporting ? "Exporting…" : "Export to CSV"}
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="a-page-header">
        <div>
          <h1 className="a-page-title">Amrut Varg Activities</h1>
          <p className="a-page-desc">Activity records filed from the public “Amrut Varg” portal. The export follows the filters below.</p>
        </div>
      </div>

      {summary && (
        <div className="a-stat-grid av-summary">
          <div className="a-stat-tile"><span className="a-stat-label">Records</span><strong className="a-stat-value">{NUMBER_FORMAT.format(summary.records)}</strong></div>
          <div className="a-stat-tile"><span className="a-stat-label">Students / participants</span><strong className="a-stat-value">{NUMBER_FORMAT.format(summary.participants)}</strong></div>
          <div className="a-stat-tile"><span className="a-stat-label">Districts covered</span><strong className="a-stat-value">{NUMBER_FORMAT.format(summary.districts)}</strong></div>
          <div className="a-stat-tile">
            <span className="a-stat-label">Daily · Weekly · Monthly</span>
            <strong className="a-stat-value">{summary.daily} · {summary.weekly} · {summary.monthly}</strong>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={data}
        loading={loading}
        error={error}
        meta={meta}
        onPage={setPage}
        onPageSize={(n) => { setLimit(n); setPage(1); }}
        toolbar={toolbar}
        actions={(row) => (
          <>
            <button className="a-action-btn" onClick={() => toggleActive(row)} disabled={saving} title={row.is_active ? "Hide from public repository" : "Show in public repository"}>
              {row.is_active ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            <button className="a-action-btn danger" onClick={() => setConfirmId(row.id)} title="Delete"><Trash2 size={15} /></button>
          </>
        )}
      />
      <ConfirmModal
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={handleDelete}
        loading={saving}
        title="Delete activity record"
        message="Delete this Amrut Varg activity record?"
        subMessage="It is removed from the public repository and from exports."
      />
    </>
  );
}
