// The 36 districts of Maharashtra, by revenue division — the one complete list
// used by every district dropdown and the District Directory.
//
// Names are in Marathi, the form the AMRUT VARG service stores (see vargs.js);
// English names live in translations.en.districts. Current official names:
// Ahilyanagar (formerly Ahmednagar), Chhatrapati Sambhajinagar (Aurangabad),
// Dharashiv (Osmanabad).

export const DISTRICTS_BY_DIVISION = {
  'कोंकण': ['मुंबई शहर', 'मुंबई उपनगर', 'ठाणे', 'पालघर', 'रायगड', 'रत्नागिरी', 'सिंधुदुर्ग'],
  'पुणे': ['पुणे', 'सातारा', 'सांगली', 'सोलापूर', 'कोल्हापूर'],
  'नाशिक': ['नाशिक', 'धुळे', 'नंदुरबार', 'जळगाव', 'अहिल्यानगर'],
  'छत्रपती संभाजीनगर': ['छत्रपती संभाजीनगर', 'जालना', 'बीड', 'धाराशिव', 'लातूर', 'नांदेड', 'हिंगोली', 'परभणी'],
  'अमरावती': ['अमरावती', 'अकोला', 'वाशिम', 'बुलढाणा', 'यवतमाळ'],
  'नागपूर': ['नागपूर', 'वर्धा', 'भंडारा', 'गोंदिया', 'चंद्रपूर', 'गडचिरोली'],
};

export const DISTRICTS = Object.values(DISTRICTS_BY_DIVISION).flat();

export const DIVISION_OF_DISTRICT = Object.fromEntries(
  Object.entries(DISTRICTS_BY_DIVISION).flatMap(([division, names]) => names.map((n) => [n, division])),
);

// Alphabetical in the reader's language. `label` maps a Marathi name to the shown name.
export const sortDistricts = (label, lang) => [...DISTRICTS].sort((a, b) => label(a).localeCompare(label(b), lang));
