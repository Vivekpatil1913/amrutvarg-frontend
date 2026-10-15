# Form validation audit

## Repository inventory

Inventory source: frontend `src/` and backend `src/`, router registrations, form controls, request handlers, database schema, and existing `node:test` files. This inventory was created before changing validation behavior for this audit.

### Public website

| Form / control | Inputs / behavior | API / storage |
|---|---|---|
| Participant registration | Name, institution/education, gender, date of birth, guardian, email, WhatsApp/phone, course/year/semester, roll number, address, district/taluka, postal code, languages, skills, emergency contact | `POST /forms/participants` → `form_submissions` |
| Organizer registration | Organizer identity, contact details, geography and organizer-specific fields | `POST /forms/organizers` → `form_submissions` |
| Leader / Amrut Varg registration | Leader/institution/coordinator, geography, date/counts/notes, enrollment details, optional photo | `POST /forms/leaders` → `form_submissions` and photo upload path |
| District directory filters | Search, division, district, taluka selection; read-only filter controls | Public directory API / masters APIs; no write form |
| Other public sections | Contact details and links, announcements, search/story navigation; no additional public submit form found in source scan | Public read APIs |

### Admin dashboard forms and controls

| Form / module | Operations / inputs | API / storage |
|---|---|---|
| Admin login | Email, password | `POST /auth/login` → `admin_users`, `admin_sessions` |
| My Profile | Name, email, avatar file; current/new/confirm password | `PATCH /auth/profile`, `POST /auth/change-password` → `admin_users` |
| Announcements | Create/edit title and descriptions (Marathi/English), link/label, date range, status, pinned/active; delete/restore | `/admin/announcements` → `announcements` |
| District Contacts | Division labels, name, role, phone, email, districts, display order, active | `/admin/contacts` → `district_contacts` |
| Geography masters | State/vibhag/district/taluka names, parent IDs, code, aliases, order, active; search and parent/status filters | `/admin/masters/*` → geography master tables |
| Website settings | Key/value settings; individual and bulk updates | `/admin/settings` → `website_settings` |
| Hero content | Translated content, slides/cards, media/image selection, visibility, ordering, CTA; media upload modal | `/admin/hero` and `/admin/media/upload` → `hero_section`, `media_assets` |
| About content | Translated text, features, image/media, icons and visibility | `/admin/about` and media API → `about_section` |
| Activities content | Translated copy, activity entries, icons, CTA and visibility | `/admin/activities` → `activities_section` |
| Session content | Translated copy, session steps, durations, ordering and visibility | `/admin/session` → `session_section` |
| Join content | Translated copy, cards, action targets/icons and visibility | `/admin/join` → `join_section` |
| Directory page content | Translated copy, directory controls and visibility | `/admin/directory` → `directory_section` |
| Vargs content | Varg geography, enrollment, display order, active; search/division filters | `/admin/vargs` → `vargs` |
| Vargs section content | Translated copy, statistics, atlas/search/list options and page limits | `/admin/vargs-section` → `vargs_section` |
| Yashogatha section content | Translated copy, category/homepage display controls | `/admin/yashogatha` → `yashogatha_section` |
| Yashogatha stories | Title, summary/body, image/media, category, publish/feature/order; search/category/status filters | `/admin/stories` → `stories`, `media_assets` |
| Footer links and socials | Headings, official URLs/icons/bilingual labels/descriptions, arbitrary social names, icon/URL/accessible labels/visibility | `/admin/footer` → `footer_section` |
| Public form configuration | Dynamic field labels, required/visible toggles and form-specific configuration | `/admin/forms` → `form_configs` |
| Media library | Multi-file image selection, search, alt text, soft delete | `/admin/media` → `media_assets` and upload storage |
| Submission management | Search/form/status filters, status/notes update, soft delete/restore | `/admin/submissions` → `form_submissions` |
| Dashboard | Refresh/read-only analytics | `/admin/dashboard` |

### Backend implementation inventory

- Framework: React 18 + Vite frontend; Express 4 backend; PostgreSQL via parameterized `pg`; Zod 3 is the backend validation library.
- Frontend forms use controlled React state, custom field errors, native controls, and shared `useForm`/`FormControls` for public registration. No frontend component test framework is installed; the frontend test script runs existing Node tests.
- Backend has Zod schemas/tests for public form configuration and several content sections. Other routes include hand-written validation, and route coverage is uneven. Uploads use Multer with a shared MIME/size filter.
- Auth uses session JWTs and `requireAuth`/`requireAdmin`. Database schema defines uniqueness and relationships for admin and content tables; request-layer coverage still needs verification.
- Automated test files found: frontend data-normalization tests; backend about, activities, contacts, directory, footer, forms submission, hero, join, session, vargs-section, and yashogatha schema tests. No API integration test harness/dependencies are configured.

## Audit findings and verification

Findings, fixes, exact field-by-field test coverage, and any blocked scenarios will be recorded below as the audit progresses. A form is marked tested only after its test actually runs.

## Findings, fixes, and verification

### Validation and security fixes made

- Public participant, organizer, and leader submissions now persist the Zod parsed result. Zod strips unexpected keys, so injected fields are not copied into submission JSON.
- Registration checks now reject impossible calendar dates, invalid standard/blood-group/language values, impossible year/semester numbers, invalid varg IDs, punctuation-only institution phone numbers, and overlong values. Selected varg IDs are checked against active, non-deleted records.
- Public submissions have a route-level rate limit. Admin login has a separate sign-in rate limit and now trims/normalizes email and bounds password input.
- Submission list filters, status updates, notes, and record IDs now have server validation. Notes are limited to 2,000 characters.
- Settings updates validate scalar values, string size, key count/length, and apply bulk changes in a transaction; an unknown key fails the entire transaction.
- Media alt text and IDs are validated. Media and leader/profile image uploads are checked against file signatures and claimed MIME type; invalid or failed uploads are removed from disk.
- Frontend shared validators now reject impossible dates and punctuation-only phone numbers. Registration API validation details are mapped to field errors, and the shared form hook blocks repeat submits while a request is active.
- Footer regression tests were updated for the shipped requirement that social names are extensible, names may repeat, and up to 30 profiles are allowed.

### Form inventory status

| Form / Module | Frontend validation | Backend validation | Tests | Status |
|---|---|---|---|---|
| Participant registration | Required/conditional fields and shared validator; API field errors now map to fields | Zod schema, strict date/options/lengths, active varg check, normalized parsed payload | Schema regression cases pass | FIXED |
| Organizer registration | Required fields and shared validator; API field errors now map to fields | Zod schema, normalized parsed payload, route limit | Schema regression cases pass | FIXED |
| Leader registration | Required fields, counts, date, photo type/size checks | Zod schema, route limit, image signature check, invalid-file cleanup | Schema and upload-signature tests pass | FIXED |
| Admin login | Native email/password controls | Zod email/password limits, rate limit, generic invalid-credential response | No auth API integration tests | BLOCKED |
| My Profile and password | Existing required/confirm checks; avatar UI does not yet validate file size/type | Zod name/email/password limits, unique email conflict, avatar signature check and cleanup | No auth API integration tests | BLOCKED |
| Announcements, Vargs, Stories, District Contacts, Geography Masters | Existing module-specific editor controls | Zod body schemas and database relationship checks where implemented | Existing unit/schema tests cover only tested modules; no route integration tests | BLOCKED |
| Hero, About, Activities, Session, Join, Directory, Footer, Vargs Section, Yashogatha Section | Existing CMS editors | Existing module-specific Zod schemas and publish/draft rules | Existing schema unit tests pass; no editor/API integration tests | BLOCKED |
| Form configuration | Existing admin editor | Zod config schema; key allowlist; revalidation when publishing | No route integration tests | BLOCKED |
| Settings | Existing settings editor | Scalar schema, bounded bulk updates, atomic transaction | No route integration tests | FIXED |
| Media upload and alt text | Existing file picker and alt-text editor | Signature/MIME check, alt limit, positive ID validation, cleanup | Signature helper test passes; no HTTP upload test | FIXED |
| Submission management | Existing filters/status controls | Bounded query/body schemas and positive IDs | No route integration tests | FIXED |
| Public directory filters/search | Search and dependent dropdown controls | Read-only APIs; some list query parsing still needs hardening | Not directly exercised | BLOCKED |
| Dashboard | Read-only dashboard controls | Auth-protected read APIs | No dashboard integration tests | PASS (no data-entry form) |

### Verification results

- Backend `npm test`: **241 passed, 0 failed**. This includes existing section schema suites, 23 public submission schema cases, and image signature checks.
- Frontend `npm test`: **31 passed, 1 failed**. The remaining failure is `server/storiesApi.test.js`: its assertion expects the bundled three-story snapshot, while the local CMS data file contains 33 published stories and the API correctly chooses the CMS source. This is unrelated to form validation.
- Frontend `npm run build`: **passed**. Vite reports an existing duplicate `districtOfficerForm` key in `src/i18n/translations.js` and a large main bundle warning.
- Backend JavaScript syntax checks: **passed** for the modified route/schema/middleware files.
- No database-backed HTTP or browser component harness is configured in either repository. Consequently, I did not mark admin forms or protected API flows as fully end-to-end tested. No production records were changed.

### Remaining risks / follow-up

- Add a disposable test database and HTTP integration tests for authenticated CRUD routes, authorization failures, invalid query/route parameters, duplicate records, and transaction rollback.
- Add browser/component tests for all admin forms and public form error rendering, accessibility focus behavior, loading states, and file-picker flows. The frontend currently has no component-test framework.
- Profile avatar file type/size feedback is missing in the admin UI even though the backend rejects invalid file signatures.
- Several legacy CRUD list endpoints still coerce pagination/filter query values with `parseInt` or call `.trim()` without schema validation. Review and migrate those to bounded query schemas before claiming complete endpoint validation.
- The frontend story API test needs a fixture-driven test or an expected value based on the CMS dataset instead of assuming the static snapshot is active.

### Files changed

- Backend: `src/modules/forms/submission.schema.js`, `src/modules/forms/submission.test.js`, `src/modules/submissions/submissions.routes.js`, `src/routes/auth.routes.js`, `src/modules/settings/settings.routes.js`, `src/modules/media/media.routes.js`, `src/middleware/upload.js`, `src/middleware/upload.test.js`, `src/middleware/error.js`, `src/modules/footer/footer.test.js`.
- Frontend: `src/services/validation.js`, `src/services/validation.test.js`, `src/services/submissions.js`, `src/hooks/useForm.js`, `package.json`.

Inventory count: **23 data-entry form modules** (3 public registration forms and 20 Admin Dashboard form/workflow groups), plus public directory search/filter controls and the read-only dashboard.
