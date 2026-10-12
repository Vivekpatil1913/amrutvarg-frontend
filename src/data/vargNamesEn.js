// English renderings of the school / place names in ./vargs.js, keyed by record id.
// The portal publishes these names in Marathi only; the snapshot in vargs.js is
// kept verbatim as the source of truth. These are transliterations of the same
// proper names (generic words such as "school" translated), not new information.
export const VARG_NAMES_EN = {
  31: 'Vedvidya Samvardhan Mandal, Jamsande / Zilla Parishad School, Nadhawade, Vaibhavwadi',
  30: 'Vatsalya Mandir',
  28: 'City of Los Angeles',
  27: 'Vilaschandra Motichandra Mehta Prashala, Solapur; Harhare Ashram School',
  26: 'Karveer Taluka',
  25: 'Balaji Nagar, Abhay Nagar',
  24: 'Vighnaharta Classes, Kolhatkar Ali, Mangalwar Peth, Satara; Samaj Bhushan Hanmantrao Salunkhe Vidyalaya, Kaledhon, Dist. Satara',
  23: 'Krantiveer Chapekar Vidya Mandir; Creative English School; Kasturi College Campus, Shikrapur; Kozicorn Society; Private ITI, Kondhapuri',
  22: 'Muktai Nagar; Ambadner Wadi Sansthan',
  21: 'Gurukrupa Society',
  20: 'Pragat Secondary & Higher Secondary Vidyalaya; Shri Samarth Vidya Mandir; ZP Primary School; Balasaheb Bharde Secondary & Higher Secondary Vidyalaya',
  19: 'Yashodeep Gurukul, Beed',
  18: 'Kalyansagar Vidyalaya, Paranda',
  17: 'Yashwant Vidyalaya; Jijamata Vidyalaya; Birajdar Classes; Ausa city; Hanuman Mandir, Chakur',
  16: 'Lal Bahadur Shastri Primary Vidyalaya and Zilla Parishad Colony',
  15: '1. Siddheshwar Vidyalaya, Vasmat 2. Shukrawar Peth, Vasmat 3. Ramkrishna English School, Hingoli 4. Arch Kids School, Govind Nagar, Hingoli',
  14: 'Sanchareshwar Vidyalaya, Jintur; Nutan Vidyalaya, Selu; Vivekanand Primary School',
  12: '1. Rising Star Kids Primary School 2. Behind Mhasoba Mandir, Sillod 3. Dnyaneshwar Vidyalaya, Nillod Phata 4. Dnyandeep Vidyalaya, Bharadi',
  11: 'Pride Convent, Bhandara; Naik Kothi, Hedgewar Chowk, Bhandara',
  10: 'Adarsh Vidyalaya; Ideal Academy Jr College, Gondia',
  9: 'ZP School, Gadchiroli; ZP School, Malampelli; ZP School, Arsoda, Armori',
  8: 'Lokmanya Tilak Vidyalaya, Chandrapur; Gandhi School, Ballarpur; Zilla Parishad School, Nagalon, Bhadravati; ZP School, Mul; ZP School, Brahmapuri',
  7: 'Hanuman Mandir, Mahsur Nagar, Wardha; Shiv Mandir, Arvi Road, Wardha',
  6: 'Dharampeth Tarkunde High School; Surendragad High School; Gayatri High School; Bhauji Daftari English School; Prahar Samajik Jagruti Sanstha; Vidarbha Buniyadi High School',
  5: 'Late Ramaji Channawar Vidyalaya, Savarkar Maidan',
  4: 'Late Ramaji Channawar Vidyalaya, Savarkar Maidan',
  3: 'Nana Mundhad, Malegaon; Sakharam Maharaj, Loni; Gurukul Mahavidyalaya, Karanja',
  2: 'Sambhaji Saunaskar Varg, Old City',
  1: 'Sada Shanti Orphanage; Riddhi Siddhi Apartment Ground; Jack n Jill School',
};

const blank = (v) => !v || !v.trim() || v.trim() === '-';

// Display name for a class in the current language; falls back to the
// published Marathi name when no English rendering exists. Empty if unnamed.
export function vargPlaceName(varg, lang) {
  if (!varg) return '';
  if (!blank(varg.vargName)) return varg.vargName.trim();
  if (blank(varg.schoolName)) return '';
  return (lang === 'en' && VARG_NAMES_EN[varg.id]) || varg.schoolName.trim();
}
