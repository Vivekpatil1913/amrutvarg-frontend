// District Coordinators / Managers shown on the District Directory page
// (/district-directory). This is the only place district-level contacts live;
// the rest of the public site links to the directory instead of to officers.
//
// Add only records that are verified and approved for public display, copied
// from the official AMRUT coordinator directory (OFFICIAL_LINKS.coordinators).
// Leave a field empty ('') when it is not approved for publication — empty
// fields are simply not shown. Nothing here should be guessed or invented.
//
// Record shape:
//   {
//     id: 'pune-coordinator',          // unique, stable key
//     district: 'पुणे',                // Marathi district name, as in vargs.js
//     role: 'coordinator',             // 'coordinator' | 'manager'
//     name: { mr: '', en: '' },        // optional
//     phone: '',                       // optional, 10-digit office number
//     email: '',                       // optional, official address
//   }

export const DISTRICT_CONTACT_ROLES = ['coordinator', 'manager'];

export const districtContacts = [];
