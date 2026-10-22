// Readable labels for submitted form data.
//
// Keys match the payloads the three form components post, so a submission can
// be read as a record rather than as raw JSON. Groups follow the order the
// visitor fills the form in. Anything not listed here still shows, labelled by
// a humanised version of its key, so a payload change can never hide data.

export const FORM_LABELS = {
  participant: "Student Registration",
  organizer: "Organizer Registration",
  leader: "Amrut Varg Leader",
};

// Values the forms submit as codes rather than words.
const VALUE_LABELS = {
  gender: { MALE: "Male", FEMALE: "Female", OTHER: "Other" },
  course: {
    SCHOOL_STUDENT: "School student",
    BBA: "BBA", BCA: "BCA", BTECH_COSMETICS: "B.Tech (Cosmetics)", BSC_IT: "B.Sc (IT)",
  },
};

const FIELD_LABELS = {
  // Participant
  amrutVargId: "Amrut Varg",
  name: "Name",
  category: "Student type",
  mobile: "Mobile",
  education: "Education",
  gender: "Gender",
  dateOfBirth: "Date of birth",
  bloodGroup: "Blood group",
  whatsappNumber: "WhatsApp number",
  email: "Email",
  standard: "Standard",
  academicYear: "Academic year",
  semester: "Semester",
  rollNumber: "Roll number",
  address: "Address",
  parentGuardianName: "Parent / guardian",
  cityTaluka: "City / taluka",
  district: "District",
  pinCode: "PIN code",
  languagesKnown: "Languages known",
  otherLanguage: "Other language",
  skills: "Skills",
  emergencyContactName: "Emergency contact",
  emergencyContactRelationship: "Relationship",
  emergencyContactPhone: "Emergency phone",
  declarationAccepted: "Declaration accepted",

  // Organizer
  // Kept for organizer submissions made before the form asked for an
  // organisation instead of a town.
  place: "Place",
  organisation: "Organization / Institution",
  branch: "Branch / Department",
  contactPerson: "Contact person name",
  designation: "Designation",

  // Leader
  leaderName: "Leader name",
  institutionName: "Institution",
  institutionEmail: "Institution email",
  institutionPhone: "Institution phone",
  division: "Division",
  taluka: "Taluka",
  village: "Village",
  coordinatorName: "Coordinator",
  coordinatorPhone: "Coordinator phone",
  coordinatorPhoneAlt: "Alternate phone",
  vargDate: "Varg date",
  participantCount: "Participants",
  vargCount: "Number of vargs",
  specialNote: "Special note",
  organizerEnrollment: "Organizer enrollment",
};

// Sections per form, in the order the visitor fills them.
const GROUPS = {
  participant: [
    { title: "Registration", keys: ["amrutVargId", "category", "course", "standard", "academicYear", "semester", "rollNumber", "education"] },
    { title: "Personal details", keys: ["name", "gender", "dateOfBirth", "bloodGroup", "parentGuardianName"] },
    { title: "Contact", keys: ["mobile", "whatsappNumber", "email", "address", "cityTaluka", "district", "pinCode"] },
    { title: "Background", keys: ["languagesKnown", "otherLanguage", "skills"] },
    { title: "Emergency contact", keys: ["emergencyContactName", "emergencyContactRelationship", "emergencyContactPhone"] },
    { title: "Declaration", keys: ["declarationAccepted"] },
  ],
  organizer: [
    { title: "Organisation", keys: ["organisation", "branch"] },
    { title: "Contact", keys: ["name", "contactPerson", "designation", "mobile"] },
    // `place` only appears on records made before the form changed.
    { title: "Location", keys: ["district", "place"] },
  ],
  leader: [
    { title: "Leader", keys: ["leaderName", "organizerEnrollment"] },
    { title: "Institution", keys: ["institutionName", "institutionEmail", "institutionPhone"] },
    { title: "Location", keys: ["division", "district", "taluka", "village"] },
    { title: "Coordinator", keys: ["coordinatorName", "coordinatorPhone", "coordinatorPhoneAlt"] },
    { title: "Varg details", keys: ["vargDate", "participantCount", "vargCount", "specialNote"] },
  ],
};

// "coordinatorPhoneAlt" -> "Coordinator phone alt", for any key not in the map.
const humanise = (key) =>
  key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/^./, (c) => c.toUpperCase());

// A few keys mean different things on different forms. `name` is the student
// on a participant record and the organiser on an organizer one, so the
// shared map cannot simply be renamed — the override is per form.
const FORM_FIELD_LABELS = {
  organizer: { name: "Organizer name" },
};

export const labelFor = (key, formType) =>
  FORM_FIELD_LABELS[formType]?.[key] ?? FIELD_LABELS[key] ?? humanise(key);

// Renders a stored value as text. Returns null when there is nothing to show,
// so the caller can mark the row as empty rather than printing "null".
export function formatValue(key, value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.map((v) => VALUE_LABELS[key]?.[v] ?? v).join(", ") : null;
  if (typeof value === "object") return JSON.stringify(value);

  const mapped = VALUE_LABELS[key]?.[value];
  if (mapped) return mapped;

  // Dates arrive as 'YYYY-MM-DD'; split rather than parse so the day cannot
  // shift by a timezone.
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    const [y, m, d] = String(value).split("-");
    return `${d}/${m}/${y}`;
  }
  return String(value);
}

// Groups a submission's data for display. Keys the map does not know about are
// collected into a final "Other details" section so nothing submitted is lost.
export function groupSubmission(formType, data = {}) {
  const groups = GROUPS[formType] ?? [];
  const used = new Set();
  const sections = [];

  for (const group of groups) {
    const rows = group.keys
      .filter((key) => key in data)
      .map((key) => {
        used.add(key);
        return { key, label: labelFor(key, formType), value: formatValue(key, data[key]) };
      });
    if (rows.length) sections.push({ title: group.title, rows });
  }

  const extra = Object.keys(data)
    .filter((key) => !used.has(key))
    .map((key) => ({ key, label: labelFor(key, formType), value: formatValue(key, data[key]) }));
  if (extra.length) sections.push({ title: "Other details", rows: extra });

  return sections;
}
