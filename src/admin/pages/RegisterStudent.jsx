import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { api } from "../api/client.js";
import { useList } from "../hooks/useApi.js";
import { useToast } from "../components/ui/Toast.jsx";
import { Section, Field, fieldErrors } from "../components/ui/FormBits.jsx";
import { errorMessage } from "../lib/errors.js";

// A District or Divisional Manager registering a school student directly into
// one of their own vargs. The varg list comes from /admin/vargs, which the CMS
// already confines to the officer's jurisdiction, and the server checks the
// varg again on save. Same fields and rules as the public school-student form.

const EMPTY = { amrutVargId: "", name: "", gender: "", dateOfBirth: "", standard: "", parentGuardianName: "" };

export default function RegisterStudent() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [count, setCount] = useState(0);
  const { data: vargs } = useList("/admin/vargs", { limit: 100, status: "PUBLISHED" }, []);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  async function save(e) {
    e.preventDefault();
    const local = {};
    if (!form.amrutVargId) local.amrutVargId = "Choose the varg";
    if (!form.name.trim()) local.name = "Name is required";
    if (!form.gender) local.gender = "Required";
    if (!form.dateOfBirth) local.dateOfBirth = "Required";
    else if (new Date(form.dateOfBirth) >= new Date(new Date().toDateString())) local.dateOfBirth = "Must be in the past";
    if (!form.standard) local.standard = "Required";
    if (!form.parentGuardianName.trim()) local.parentGuardianName = "Required";
    setErrors(local);
    if (Object.keys(local).length) return;
    setSaving(true);
    try {
      await api.post("/admin/submissions/register-participant", {
        ...form,
        amrutVargId: Number(form.amrutVargId),
        name: form.name.trim(),
        parentGuardianName: form.parentGuardianName.trim(),
        course: "SCHOOL_STUDENT",
        declarationAccepted: true,
      });
      toast.success(`${form.name.trim()} registered`);
      setCount((c) => c + 1);
      // Keep the varg chosen: the next student is usually for the same batch.
      setForm({ ...EMPTY, amrutVargId: form.amrutVargId });
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err, "Could not register the student"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="a-page-header">
        <div>
          <h1 className="a-page-title">Register Student</h1>
          <p className="a-page-desc">Enrol a school student directly into one of your Amrut Vargs.{count ? ` ${count} registered this session.` : ""}</p>
        </div>
        <button className="a-btn a-btn-secondary" onClick={() => navigate("/admin/submissions?form_type=participant")}>View registrations</button>
      </div>
      <form onSubmit={save} noValidate style={{ maxWidth: 760 }}>
        <Section title="Student" desc="Only vargs inside your jurisdiction are listed.">
          <Field label="Amrut Varg (batch)" required error={errors.amrutVargId}>
            <select className="a-input" value={form.amrutVargId} onChange={(e) => set({ amrutVargId: e.target.value })}>
              <option value="">Select…</option>
              {vargs.map((v) => <option key={v.id} value={v.id}>{v.school_name} — {v.district_en || v.district_mr}{v.taluka ? `, ${v.taluka}` : ""}</option>)}
            </select>
          </Field>
          <div className="a-form-grid a-form-grid-2">
            <Field label="Student name" required error={errors.name}><input className="a-input" maxLength={255} value={form.name} onChange={(e) => set({ name: e.target.value })} /></Field>
            <Field label="Parent / guardian name" required error={errors.parentGuardianName}><input className="a-input" maxLength={255} value={form.parentGuardianName} onChange={(e) => set({ parentGuardianName: e.target.value })} /></Field>
            <Field label="Gender" required error={errors.gender}>
              <select className="a-input" value={form.gender} onChange={(e) => set({ gender: e.target.value })}>
                <option value="">Select…</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option>
              </select>
            </Field>
            <Field label="Date of birth" required error={errors.dateOfBirth}><input className="a-input" type="date" value={form.dateOfBirth} onChange={(e) => set({ dateOfBirth: e.target.value })} /></Field>
            <Field label="Standard" required error={errors.standard}>
              <select className="a-input" value={form.standard} onChange={(e) => set({ standard: e.target.value })}>
                <option value="">Select…</option>
                {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}</option>)}
              </select>
            </Field>
          </div>
          <button className="a-btn a-btn-primary" type="submit" disabled={saving}><GraduationCap size={15} /> {saving ? "Registering…" : "Register student"}</button>
        </Section>
      </form>
    </>
  );
}
