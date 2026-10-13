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

// All 36, in the official order (alphabetical by English name). Every list
// shows them in this order, in both languages.
export const DISTRICTS = [
  'अहिल्यानगर',
  'अकोला',
  'अमरावती',
  'बीड',
  'भंडारा',
  'बुलढाणा',
  'चंद्रपूर',
  'छत्रपती संभाजीनगर',
  'धाराशिव',
  'धुळे',
  'गडचिरोली',
  'गोंदिया',
  'हिंगोली',
  'जळगाव',
  'जालना',
  'कोल्हापूर',
  'लातूर',
  'मुंबई शहर',
  'मुंबई उपनगर',
  'नागपूर',
  'नांदेड',
  'नंदुरबार',
  'नाशिक',
  'पालघर',
  'परभणी',
  'पुणे',
  'रायगड',
  'रत्नागिरी',
  'सांगली',
  'सातारा',
  'सिंधुदुर्ग',
  'सोलापूर',
  'ठाणे',
  'वर्धा',
  'वाशिम',
  'यवतमाळ',
];

export const DIVISION_OF_DISTRICT = Object.fromEntries(
  Object.entries(DISTRICTS_BY_DIVISION).flatMap(([division, names]) => names.map((n) => [n, division])),
);