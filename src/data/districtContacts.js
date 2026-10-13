// Amrut Varg regional team shown on the District Directory page
// (/district-directory). This is the only place team contacts live; the rest
// of the public site links to the directory instead of to individuals.
//
// Source: the regional team contact sheet (विभाग, नाव, पद, जिल्हा, ई-मेल,
// संपर्क क्रमांक), one record per person. Cleaned on entry: repeated rows
// merged, email typos fixed and lower-cased, Marathi digits converted.
// A phone shared by many rows in the sheet (a placeholder, not anyone's own
// number) was left out — those records show email only.
//
// Record: [division, roles, districts, name, email, phone]
//   division  — key of translations.en.divisions (कोंकण, पुणे, नाशिक,
//               छत्रपती संभाजीनगर = मराठवाडा, अमरावती, नागपूर)
//   roles     — keys of CONTACT_ROLES; more than one when a person holds both
//   districts — Marathi district names; [] for division-level posts
//   phone     — 10 digits, or '' when not available

// Display order of roles: divisional manager first, then the rest.
export const CONTACT_ROLES = ['divisionalManager', 'districtManager', 'dataEntry', 'sakhi', 'mitra', 'amrutMitra'];

const DM = 'divisionalManager';
const DIST = 'districtManager';
const DEO = 'dataEntry';
const SAKHI = 'sakhi';
const MITRA = 'mitra';
const AMRUT_MITRA = 'amrutMitra';

const ROWS = [
  // ---------- कोकण विभाग ----------
  ['कोंकण', [DM], ['रत्नागिरी'], 'अमित श्रीपाद सामंत', 'amrut.kokan.div@gmail.com', '9112227669'],
  ['कोंकण', [DIST], ['मुंबई शहर'], 'राजेश गोपीचंद पवार', 'amrut.mumbaicity@gmail.com', '9892848348'],
  ['कोंकण', [DIST], ['रायगड'], 'शैलेश विनायक मराठे', 'astutealibag@gmail.com', '9423892182'],
  ['कोंकण', [DIST], ['रत्नागिरी'], 'संतोष मधुकर जुवळे', 'santoshjuvale88@gmail.com', '8087276515'],
  ['कोंकण', [DIST], ['सिंधुदुर्ग'], 'श्रीराम जयप्रकाश केळकर', 'shriram.kelkar2000@gmail.com', '8554059044'],
  ['कोंकण', [DEO], ['पालघर'], 'अमित उदय आठवले', 'amitathavale743@gmail.com', '9975117807'],
  ['कोंकण', [DEO], ['ठाणे'], 'माया विनोद खेत्रे', 'maya.khetre21@gmail.com', '8108383871'],
  ['कोंकण', [SAKHI], ['रत्नागिरी'], 'अश्विनी पुरुषोत्तम करमरकर', 'ashwinikarmarkar9@gmail.com', '8275260285'],
  ['कोंकण', [SAKHI], ['रायगड'], 'जान्हवी महेंद्र साठे', 'janhavisathe6@gmail.com', '8879278740'],

  // ---------- पुणे विभाग ----------
  ['पुणे', [DM], ['पुणे'], 'प्रथमेश प्रशांत कुलकर्णी', 'prathameshkulkarni33@gmail.com', ''],
  ['पुणे', [DIST], ['पुणे'], 'सिद्धेश नरहरी केसकर', 'siddheshkeskar3@gmail.com', '9359403891'],
  ['पुणे', [DIST], ['सातारा'], 'विनायक मंगलधीश पाठकजी', 'mangalsut@gmail.com', '9923197206'],
  ['पुणे', [DIST], ['सांगली'], 'मनोज मारुती मिरासदार', 'mirasdarm@gmail.com', '7057607419'],
  ['पुणे', [DIST], ['सोलापूर'], 'श्रेयस आनंद कुलकर्णी', 'kulalok1@gmail.com', '8669589834'],
  ['पुणे', [DIST], ['कोल्हापूर'], 'प्रशांत अरुण जोशी', 'prashant3996@gmail.com', '9822414375'],
  ['पुणे', [DEO], ['सातारा'], 'अविनाश अनंतकुमार कुलकर्णी', 'avikulkarni259@gmail.com', ''],
  ['पुणे', [DEO], ['सांगली'], 'शैलेंद्र शरद जहागिरदार', 'jahagirdarshailendra@gmail.com', '7972830757'],
  ['पुणे', [DEO], ['सोलापूर'], 'बिरुदेव अज्ञान वाघमोडे', 'birudevwaghmode01@gmail.com', '9284483216'],
  ['पुणे', [DEO], ['कोल्हापूर'], 'अभिजीत अरुण कुलकर्णी', 'abhijeetarunkulkarni111@gmail.com', '8275378019'],
  ['पुणे', [SAKHI], ['पुणे'], 'शीतल वेदांत कुलकर्णी', 'sheetalkulkarni618@gmail.com', '7276414713'],
  ['पुणे', [SAKHI], ['सांगली'], 'गौरी महेश कुलकर्णी', 'gourikulkarni20@gmail.com', ''],
  ['पुणे', [SAKHI], ['सोलापूर'], 'आर्या विवेक कुलकर्णी', 'aryakulkarni1503@gmail.com', '9145281104'],

  // ---------- नाशिक विभाग ----------
  ['नाशिक', [DM], ['नाशिक'], 'मंगेश अच्युत खाडीलकर', 'khadilkarmangesh@gmail.com', '9881699155'],
  ['नाशिक', [DIST], ['नाशिक'], 'दिपक हरिलाल गुप्ता', 'journalist.guptadipak@gmail.com', '9423476929'],
  ['नाशिक', [DIST], ['धुळे'], 'हेमंत अरुण पाठक', 'pathak.hemant3217@gmail.com', '9822829555'],
  ['नाशिक', [DIST], ['नंदुरबार'], 'योगेश भीमराव अहिरे', 'ahirey85@gmail.com', '9730881165'],
  ['नाशिक', [DIST], ['जळगाव'], 'राजेंद्र भगवानराव कानडे', 'rajendrakanade16@gmail.com', '8237657178'],
  ['नाशिक', [DIST], ['अहिल्यानगर'], 'सागर पंढरीनाथ भोपे', 'sagarbhope11@gmail.com', '9766622274'],
  ['नाशिक', [DEO], [], 'कीर्ती अमित शेटे', 'kirt2589@gmail.com', ''],
  ['नाशिक', [DEO], ['नाशिक'], 'संजय शंकरगिर गोसावी', 'gosavisanjay15@gmail.com', '8857073911'],
  ['नाशिक', [DEO], ['धुळे'], 'विनोद विश्वेश्वर देशपांडे', 'vinodoffice789@gmail.com', '9403019099'],
  ['नाशिक', [DEO], ['जळगाव'], 'प्रद्योत भालचंद्र कुळकर्णी', 'kulkarni.pradyot@gmail.com', '7620782295'],
  ['नाशिक', [DEO], ['अहिल्यानगर'], 'वैभव फक्कडराव कुलकर्णी', 'kulkarnivaibhav375@gmail.com', ''],
  ['नाशिक', [SAKHI], ['नाशिक'], 'हर्षाली प्रसाद पुराणिक', 'harshumalwatkar09@gmail.com', '7840969081'],
  ['नाशिक', [SAKHI], ['धुळे'], 'वैशाली दिलीप कुलकर्णी', 'vaishalikulkarni710@gmail.com', '7779057899'],
  ['नाशिक', [SAKHI], ['अहिल्यानगर'], 'गौरी अशोक कुलकर्णी', 'kulkarnigauri220@gmail.com', '8669010131'],
  ['नाशिक', [MITRA], ['नाशिक'], 'मयूर मधुकर हातवळणे', 'mayurhatwalne12@gmail.com', '9860513428'],
  ['नाशिक', [MITRA], ['नंदुरबार'], 'कार्तिकसिंग जीवनसिंग परदेशी', 'kartikpardeshi19655@gmail.com', '8308246201'],
  ['नाशिक', [MITRA], ['जळगाव'], 'किरण सुरेश शिंपी', 'kiranshimpi89@gmail.com', '9604050630'],
  ['नाशिक', [MITRA], ['अहिल्यानगर'], 'संदिप विजयकुमार देशपांडे', 'sandeepdeshpande152@gmail.com', ''],
  ['नाशिक', [MITRA], ['अहिल्यानगर'], 'शरद आण्णासाहेब क्षिरसागर', 'kshirsagarsharad8@gmail.com', ''],
  ['नाशिक', [AMRUT_MITRA], ['नाशिक'], 'अजिंक्य संजय कन्नाल', 'ajinkyakannal@gmail.com', '9665692676'],

  // ---------- मराठवाडा (छत्रपती संभाजीनगर) विभाग ----------
  ['छत्रपती संभाजीनगर', [DIST], ['छत्रपती संभाजीनगर'], 'अक्षय चंद्रकांत लंबे', 'aclambeoffice@gmail.com', '7350691680'],
  ['छत्रपती संभाजीनगर', [DIST], ['जालना'], 'नितीन सूर्यकांत खेकाळे', 'ni3khekale@gmail.com', ''],
  ['छत्रपती संभाजीनगर', [DIST], ['बीड'], 'विशाल अशोकराव जोशी', 'vishaljoshi251@gmail.com', '9421173251'],
  ['छत्रपती संभाजीनगर', [DIST], ['धाराशिव'], 'चिन्मय प्रभाकर कुलकर्णी', 'chinmay.k951@gmail.com', ''],
  ['छत्रपती संभाजीनगर', [DIST], ['लातूर'], 'शुभम सुहासराव मुळजकर', 'shubham.mulajakar@gmail.com', ''],
  ['छत्रपती संभाजीनगर', [DIST], ['नांदेड'], 'सौरभ संतोष माळहिप्परगेकर', 'mail4saurabh9290@gmail.com', '7083868522'],
  ['छत्रपती संभाजीनगर', [DIST], ['हिंगोली'], 'श्रीकांत गंगाधर धोतरे', 'shrikantdhotare1019@gmail.com', ''],
  ['छत्रपती संभाजीनगर', [DIST], ['परभणी'], 'अनिरुद्ध प्रमोदराव काटे', 'apkate50@gmail.com', ''],
  ['छत्रपती संभाजीनगर', [DEO], [], 'रुचा शामसुंदरजी शर्मा', 'ruchasharma73@gmail.com', '7709080073'],
  ['छत्रपती संभाजीनगर', [DEO], ['छत्रपती संभाजीनगर'], 'योगेश भास्करराव रोडे', 'rode.yogesh199@gmail.com', '9403200606'],
  ['छत्रपती संभाजीनगर', [DEO], ['बीड'], 'चिंतेश रामभाऊ जोशी', 'chintesh154@gmail.com', '9421944752'],
  ['छत्रपती संभाजीनगर', [DEO], ['धाराशिव'], 'अजय उमेश कुलकर्णी', 'ajaykulkarni.unilever@gmail.com', '9130354294'],
  ['छत्रपती संभाजीनगर', [DEO], ['लातूर'], 'ओमकार भूषण शेटे', 'omishete@gmail.com', '7391998866'],
  ['छत्रपती संभाजीनगर', [DEO], ['नांदेड'], 'विश्वेश्वर वासुदेवराव जोशी', 'joshivishweshwar2@gmail.com', '8600240032'],
  ['छत्रपती संभाजीनगर', [DEO], ['हिंगोली'], 'दिगंबर भाऊदेव जोशी', 'digjos170@gmail.com', '9890559261'],
  ['छत्रपती संभाजीनगर', [DEO], ['परभणी'], 'रवि अरुणराव कुलकर्णी', 'kulkarniravi500@gmail.com', ''],
  ['छत्रपती संभाजीनगर', [SAKHI], ['छत्रपती संभाजीनगर'], 'मंजु अतुल कुलकर्णी', 'manju.a.kulkarni@gmail.com', '9404593726'],
  ['छत्रपती संभाजीनगर', [MITRA], ['छत्रपती संभाजीनगर'], 'रामेश्वर शिवाजी साळुंके', 'rameshwarsalunke518@gmail.com', ''],
  ['छत्रपती संभाजीनगर', [MITRA], ['बीड'], 'सुमित शिवाजीराव धिरडे', 'sumitrajedhirde@gmail.com', '9975677272'],
  ['छत्रपती संभाजीनगर', [MITRA], ['धाराशिव'], 'रवि रमेश वैद्य', 'ravivaidya60@gmail.com', '7057335232'],
  ['छत्रपती संभाजीनगर', [MITRA], ['लातूर'], 'प्रशांत विजय कापसे', 'prashantkapse27121997@gmail.com', '9923878803'],
  ['छत्रपती संभाजीनगर', [MITRA], ['नांदेड'], 'विश्वास कृष्णराव बदापूरकर', 'badapurkarvishwas@gmail.com', '9422874346'],
  ['छत्रपती संभाजीनगर', [MITRA], ['हिंगोली'], 'संजय रामराव मेथेकर', 'smethekar80@gmail.com', ''],
  ['छत्रपती संभाजीनगर', [MITRA], ['परभणी'], 'अनंत रावसाहेब जोगदंड', 'anant.lic2010@rediffmail.com', ''],

  // ---------- अमरावती विभाग ----------
  ['अमरावती', [DM], [], 'प्रविण प्रकाश कोळेश्वर', 'pravinkoleshwar@gmail.com', '9370499541'],
  ['अमरावती', [DIST], ['अमरावती'], 'ऋषिकेश हरिष कथलकर', 'rkathalkar24@gmail.com', '7249451152'],
  ['अमरावती', [DIST], ['बुलढाणा'], 'जिग्नेश शैलेश कमानी', 'jigneshkamani1993@gmail.com', '8308998922'],
  ['अमरावती', [DIST], ['यवतमाळ'], 'परिक्षीत कमलकिशोर शर्मा', 'parikshitsharma143@gmail.com', '8087248674'],
  ['अमरावती', [DEO], ['अकोला'], 'गणेश शामराव मुळे', 'muleyg26@gmail.com', '8975522591'],
  ['अमरावती', [DEO, SAKHI], ['अकोला'], 'प्राची प्रवीण देव', 'deoprachi33@gmail.com', '9923321393'],
  ['अमरावती', [DEO], ['वाशिम', 'अकोला'], 'योगेश अरविंद जोशी', 'yogeshjoshi068@gmail.com', '8379083865'],
  ['अमरावती', [DEO], ['वाशिम'], 'रोहित वसंतराव देशमुख', 'kale9421@gmail.com', '9850389811'],
  ['अमरावती', [DEO], ['बुलढाणा'], 'नंदकिशोर मोतीराम मगर', 'magarnandu93@gmail.com', '9503698881'],
  ['अमरावती', [DEO], ['यवतमाळ'], 'कामेश दिलीप राखे', 'kameshd.rakhe03@gmail.com', '7020984512'],
  ['अमरावती', [SAKHI], ['अमरावती'], 'साक्षी सुनील कुळकर्णी', 'sakshiskulkarni1998@gmail.com', '7972896998'],
  ['अमरावती', [SAKHI], ['बुलढाणा'], 'नम्रता प्रणव वाचपे', 'namratawachpe@gmail.com', '9356627306'],
  ['अमरावती', [SAKHI], ['यवतमाळ'], 'भार्गवी जितेंद्र लाखे', 'bhargavilakhe28@gmail.com', '9158075546'],
  ['अमरावती', [MITRA], ['अमरावती'], 'केदार विनायक चावरकर', 'k96657@gmail.com', '8149087497'],
  ['अमरावती', [MITRA], ['वाशिम'], 'नंदकिशोर प्रभाकर वनस्कर', 'santaji8011@gmail.com', ''],

  // ---------- नागपूर विभाग ----------
  ['नागपूर', [DM], ['नागपूर'], 'धनंजय गोपाळराव कुळकर्णी', 'kulkarnid760@gmail.com', ''],
  ['नागपूर', [DIST], ['नागपूर'], 'आदित्य अवधूत कुलकर्णी', 'aadikul3121@gmail.com', ''],
  ['नागपूर', [DIST], ['वर्धा'], 'ऋषिकेश पंडितराव खराटे', 'rushikeshkharate57@gmail.com', '7709226229'],
  ['नागपूर', [DIST], ['भंडारा'], 'ओमकार मिलिंदराव हरदास', 'omkarhardas885@gmail.com', '8857934732'],
  ['नागपूर', [DIST], ['गोंदिया'], 'कार्तिक रविशंकर तिवारी', 'kartiktiwari722@gmail.com', '7620442709'],
  ['नागपूर', [DIST], ['चंद्रपूर'], 'आदित्यसिंह शंकरसिंह सेंगर', 'sengaraditya57@gmail.com', ''],
  ['नागपूर', [DIST], ['गडचिरोली'], 'विक्रममोहन सुधाकर पांडे', 'vikramp844@gmail.com', ''],
  ['नागपूर', [DEO], ['नागपूर'], 'ओंकार लक्ष्मण गांधी', 'omkargandhi1@gmail.com', ''],
  ['नागपूर', [DEO], ['वर्धा'], 'धीरज भिकमचंद राठी', 'dhirajrathi125@gmail.com', ''],
  ['नागपूर', [DEO], ['गोंदिया'], 'पियुष महेश पुरोहित', 'piyushpurohit1212@gmail.com', ''],
  ['नागपूर', [DEO], ['चंद्रपूर'], 'वैष्णवी अंकुश दारव्हेकर', 'vaishnaviamgaonkar2018@gmail.com', ''],
  ['नागपूर', [DEO], ['गडचिरोली'], 'माधुरी महेश रोटकर', 'madhurotkar132@gmail.com', '9923780790'],
  ['नागपूर', [SAKHI], ['नागपूर'], 'नितु आनंद वसाडकर', 'nvasadkar@gmail.com', '8956119837'],
  ['नागपूर', [SAKHI], ['वर्धा'], 'सायली अनिरुद्ध कठाळे', 'sayalikathale03@gmail.com', '8788387315'],
  ['नागपूर', [SAKHI], ['भंडारा'], 'साक्षी प्रशांत जोशी', 'sakshijoshi20001@gmail.com', ''],
  ['नागपूर', [MITRA], ['नागपूर'], 'निखिलेश नरेंद्र रहिसे', 'nikhileshrahise@gmail.com', ''],
  ['नागपूर', [MITRA], ['गोंदिया'], 'प्रणय मदनसिंह नागले', 'pranaynagle9@gmail.com', '7397823304'],
  ['नागपूर', [MITRA], ['चंद्रपूर'], 'सतीश कनकैया नारायणदास', 'mrsnarayandas@gmail.com', '9890746453'],
  ['नागपूर', [MITRA], ['गडचिरोली'], 'वेदांत सुनील मेहता', 'vedsunilmehta@gmail.com', '8208407357'],
];

export const districtContacts = ROWS.map(([division, roles, districts, name, email, phone]) => ({
  id: email,
  division,
  roles,
  districts,
  name,
  email,
  phone,
}));
