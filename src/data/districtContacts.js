// Amrut Varg regional team shown on the District Directory page
// (/district-directory). This is the only place team contacts live; the rest
// of the public site links to the directory instead of to individuals.
//
// Source: the regional team contact sheet (विभाग, पूर्ण नाव, पद, जिल्हा, ई-मेल,
// खाजगी संपर्क क्रमांक) — all 103 rows, in the sheet's order, every field kept.
// Only formatting is normalised: email typos fixed (gmial, gmail..com, stray
// spaces) and lower-cased, Marathi digits written as 0–9, and district
// spellings matched to the 36-district list (जळगांव → जळगाव, वाशीम → वाशिम,
// छ. संभाजीनगर → छत्रपती संभाजीनगर, पुणे जिल्हा → पुणे).
//
// Row: [division, role, districts, name, email, phone]
//   division  — key of translations.en.divisions; मराठवाडा = छत्रपती संभाजीनगर
//   role      — key of CONTACT_ROLES
//   districts — Marathi district names; [] where the sheet names the whole
//               division (e.g. "अमरावती विभाग"). 'मुंबई' is kept as written.

// Display order of roles: divisional manager first, then the rest.
export const CONTACT_ROLES = ['divisionalManager', 'districtManager', 'dataEntry', 'sakhi', 'mitra', 'amrutMitra'];

const DM = 'divisionalManager';
const DIST = 'districtManager';
const DEO = 'dataEntry';
const SAKHI = 'sakhi';
const MITRA = 'mitra';
const AMRUT_MITRA = 'amrutMitra';

const KOK = 'कोंकण';
const PUN = 'पुणे';
const NSK = 'नाशिक';
const MWD = 'छत्रपती संभाजीनगर';
const AMR = 'अमरावती';
const NGP = 'नागपूर';

const ROWS = [
  [NSK, DIST, ['नंदुरबार'], 'योगेश भीमराव अहिरे', 'ahirey85@gmail.com', '9730881165'],
  [AMR, SAKHI, ['यवतमाळ'], 'भार्गवी जितेंद्र लाखे', 'bhargavilakhe28@gmail.com', '9158075546'],
  [AMR, DEO, ['वाशिम'], 'रोहित वसंतराव देशमुख', 'kale9421@gmail.com', '9850389811'],
  [AMR, DIST, ['वाशिम', 'अकोला'], 'योगेश अरविंद जोशी', 'yogeshjoshi068@gmail.com', '8379083865'],
  [KOK, DEO, ['पालघर'], 'अमित उदय आठवले', 'amitathavale743@gmail.com', '9975117807'],
  [MWD, MITRA, ['धाराशिव'], 'रवि रमेश वैद्य', 'ravivaidya60@gmail.com', '7057335232'],
  [AMR, DEO, ['अकोला'], 'गणेश शामराव मुळे', 'muleyg26@gmail.com', '8975522591'],
  [NSK, SAKHI, ['अहिल्यानगर'], 'गौरी अशोक कुलकर्णी', 'kulkarnigauri220@gmail.com', '8669010131'],
  [AMR, DEO, ['अकोला'], 'प्राची प्रवीण देव', 'deoprachi33@gmail.com', '9923321393'],
  [PUN, DIST, ['सांगली'], 'मनोज मारुती मिरासदार', 'mirasdarm@gmail.com', '7057607419'],
  [NSK, DEO, ['जळगाव'], 'प्रद्योत भालचंद्र कुळकर्णी', 'kulkarni.pradyot@gmail.com', '7620782295'],
  [KOK, DIST, ['रायगड'], 'शैलेश विनायक मराठे', 'astutealibag@gmail.com', '9423892182'],
  [PUN, DIST, ['पुणे'], 'सिद्धेश नरहरी केसकर', 'siddheshkeskar3@gmail.com', '9359403891'],
  [NSK, DEO, ['जळगाव'], 'प्रद्योत भालचंद्र कुळकर्णी', 'kulkarni.pradyot@gmail.com', '7620782295'],
  [MWD, MITRA, ['बीड'], 'सुमित शिवाजीराव धिरडे', 'sumitrajedhirde@gmail.com', '9975677272'],
  [PUN, DEO, ['कोल्हापूर'], 'अभिजीत अरुण कुलकर्णी', 'abhijeetarunkulkarni111@gmail.com', '8275378019'],
  [AMR, DIST, ['अमरावती'], 'ऋषिकेश हरिष कथलकर', 'rkathalkar24@gmail.com', '7249451152'],
  [AMR, MITRA, ['अमरावती'], 'केदार विनायक चावरकर', 'k96657@gmail.com', '8149087497'],
  [NSK, MITRA, ['नाशिक'], 'मयूर मधुकर हातवळणे', 'mayurhatwalne12@gmail.com', '9860513428'],
  [PUN, DIST, ['सातारा'], 'विनायक मंगलधीश पाठकजी', 'mangalsut@gmail.com', '9923197206'],
  [NSK, DIST, ['अहिल्यानगर'], 'सागर पंढरीनाथ भोपे', 'sagarbhope11@gmail.com', '9766622274'],
  [MWD, DIST, ['नांदेड'], 'सौरभ संतोष माळहिप्परगेकर', 'mail4saurabh9290@gmail.com', '7083868522'],
  [AMR, SAKHI, ['अमरावती'], 'साक्षी सुनील कुळकर्णी', 'sakshiskulkarni1998@gmail.com', '7972896998'],
  [PUN, SAKHI, ['पुणे'], 'शीतल वेदांत कुलकर्णी', 'sheetalkulkarni618@gmail.com', '7276414713'],
  [MWD, DEO, ['नांदेड'], 'विश्वेश्वर वासुदेवराव जोशी', 'joshivishweshwar2@gmail.com', '8600240032'],
  [MWD, DEO, ['लातूर'], 'ओमकार भूषण शेटे', 'omishete@gmail.com', '7391998866'],
  [MWD, MITRA, ['नांदेड'], 'विश्वास कृष्णराव बदापूरकर', 'badapurkarvishwas@gmail.com', '9422874346'],
  [NGP, MITRA, ['गोंदिया'], 'प्रणय मदनसिंह नागले', 'pranaynagle9@gmail.com', '7397823304'],
  [NGP, DIST, ['वर्धा'], 'ऋषिकेश पंडितराव खराटे', 'rushikeshkharate57@gmail.com', '7709226229'],
  [PUN, DEO, ['सोलापूर'], 'बिरुदेव अज्ञान वाघमोडे', 'birudevwaghmode01@gmail.com', '9284483216'],
  [MWD, DEO, ['धाराशिव'], 'अजय उमेश कुलकर्णी', 'ajaykulkarni.unilever@gmail.com', '9130354294'],
  [MWD, DEO, ['बीड'], 'चिंतेश रामभाऊ जोशी', 'chintesh154@gmail.com', '9421944752'],
  [AMR, DM, [], 'प्रविण प्रकाश कोळेश्वर', 'pravinkoleshwar@gmail.com', '9370499541'],
  [KOK, DEO, ['ठाणे'], 'माया विनोद खेत्रे', 'maya.khetre21@gmail.com', '8108383871'],
  [NSK, MITRA, ['जळगाव'], 'किरण सुरेश शिंपी', 'kiranshimpi89@gmail.com', '9604050630'],
  [KOK, DIST, ['सिंधुदुर्ग'], 'श्रीराम जयप्रकाश केळकर', 'shriram.kelkar2000@gmail.com', '8554059044'],
  [AMR, SAKHI, ['अकोला'], 'प्राची प्रवीण देव', 'deoprachi33@gmail.com', '9923321393'],
  [NGP, DIST, ['गोंदिया'], 'कार्तिक रविशंकर तिवारी', 'kartiktiwari722@gmail.com', '7620442709'],
  [PUN, DEO, ['सातारा'], 'अविनाश अनंतकुमार कुलकर्णी', 'avikulkarni259@gmail.com', '9823228596'],
  [NSK, MITRA, ['अहिल्यानगर'], 'संदिप विजयकुमार देशपांडे', 'sandeepdeshpande152@gmail.com', '9823228596'],
  [MWD, DEO, ['परभणी'], 'रवि अरुणराव कुलकर्णी', 'kulkarniravi500@gmail.com', '9823228596'],
  [NGP, DIST, ['नागपूर'], 'आदित्य अवधूत कुलकर्णी', 'aadikul3121@gmail.com', '9823228596'],
  [PUN, SAKHI, ['सांगली'], 'गौरी महेश कुलकर्णी', 'gourikulkarni20@gmail.com', '9823228596'],
  [MWD, DIST, ['धाराशिव'], 'चिन्मय प्रभाकर कुलकर्णी', 'chinmay.k951@gmail.com', '9823228596'],
  [MWD, DIST, ['लातूर'], 'शुभम सुहासराव मुळजकर', 'shubham.mulajakar@gmail.com', '9823228596'],
  [NSK, MITRA, ['अहिल्यानगर'], 'शरद आण्णासाहेब क्षिरसागर', 'kshirsagarsharad8@gmail.com', '9823228596'],
  [NGP, DEO, ['गोंदिया'], 'पियुष महेश पुरोहित', 'piyushpurohit1212@gmail.com', '9823228596'],
  [AMR, MITRA, ['वाशिम'], 'नंदकिशोर प्रभाकर वनस्कर', 'santaji8011@gmail.com', '9823228596'],
  [MWD, MITRA, ['छत्रपती संभाजीनगर'], 'रामेश्वर शिवाजी साळुंके', 'rameshwarsalunke518@gmail.com', '9823228596'],
  [NGP, SAKHI, ['भंडारा'], 'साक्षी प्रशांत जोशी', 'sakshijoshi20001@gmail.com', '9823228596'],
  [NGP, DM, ['नागपूर'], 'धनंजय गोपाळराव कुळकर्णी', 'kulkarnid760@gmail.com', '9823228596'],
  [MWD, DIST, ['जालना'], 'नितीन सूर्यकांत खेकाळे', 'ni3khekale@gmail.com', '9823228596'],
  [MWD, MITRA, ['हिंगोली'], 'संजय रामराव मेथेकर', 'smethekar80@gmail.com', '9823228596'],
  [MWD, MITRA, ['परभणी'], 'अनंत रावसाहेब जोगदंड', 'anant.lic2010@rediffmail.com', '9823228596'],
  [NGP, DEO, ['नागपूर'], 'ओंकार लक्ष्मण गांधी', 'omkargandhi1@gmail.com', '9823228596'],
  [NGP, DEO, ['वर्धा'], 'धीरज भिकमचंद राठी', 'dhirajrathi125@gmail.com', '9823228596'],
  [NGP, MITRA, ['नागपूर'], 'निखिलेश नरेंद्र रहिसे', 'nikhileshrahise@gmail.com', '9823228596'],
  [NSK, DEO, [], 'कीर्ती अमित शेटे', 'kirt2589@gmail.com', '9823228596'],
  [MWD, DIST, ['हिंगोली'], 'श्रीकांत गंगाधर धोतरे', 'shrikantdhotare1019@gmail.com', '9823228596'],
  [NSK, DEO, ['अहिल्यानगर'], 'वैभव फक्कडराव कुलकर्णी', 'kulkarnivaibhav375@gmail.com', '9823228596'],
  [MWD, DIST, ['परभणी'], 'अनिरुद्ध प्रमोदराव काटे', 'apkate50@gmail.com', '9823228596'],
  [NGP, DIST, ['गडचिरोली'], 'विक्रममोहन सुधाकर पांडे', 'vikramp844@gmail.com', '9823228596'],
  [NGP, DEO, ['चंद्रपूर'], 'वैष्णवी अंकुश दारव्हेकर', 'vaishnaviamgaonkar2018@gmail.com', '9823228596'],
  [NGP, DIST, ['चंद्रपूर'], 'आदित्यसिंह शंकरसिंह सेंगर', 'sengaraditya57@gmail.com', '9823228596'],
  [PUN, DM, ['पुणे'], 'प्रथमेश प्रशांत कुलकर्णी', 'prathameshkulkarni33@gmail.com', '9823228596'],
  [NSK, SAKHI, ['धुळे'], 'वैशाली दिलीप कुलकर्णी', 'vaishalikulkarni710@gmail.com', '7779057899'],
  [PUN, DIST, ['सोलापूर'], 'श्रेयस आनंद कुलकर्णी', 'kulalok1@gmail.com', '8669589834'],
  [NGP, MITRA, ['चंद्रपूर'], 'सतीश कनकैया नारायणदास', 'mrsnarayandas@gmail.com', '9890746453'],
  [NGP, MITRA, ['गडचिरोली'], 'वेदांत सुनील मेहता', 'vedsunilmehta@gmail.com', '8208407357'],
  [NGP, DEO, ['गडचिरोली'], 'सौ माधुरी महेश रोटकर', 'madhurotkar132@gmail.com', '9923780790'],
  [KOK, DIST, ['रत्नागिरी'], 'संतोष मधुकर जुवळे', 'santoshjuvale88@gmail.com', '8087276515'],
  [MWD, DEO, [], 'रुचा शामसुंदरजी शर्मा', 'ruchasharma73@gmail.com', '7709080073'],
  [KOK, SAKHI, ['रत्नागिरी'], 'अश्विनी पुरुषोत्तम करमरकर', 'ashwinikarmarkar9@gmail.com', '8275260285'],
  [NGP, DIST, ['भंडारा'], 'ओमकार मिलिंदराव हरदास', 'omkarhardas885@gmail.com', '8857934732'],
  [PUN, SAKHI, ['सोलापूर'], 'आर्या विवेक कुलकर्णी', 'aryakulkarni1503@gmail.com', '9145281104'],
  [KOK, SAKHI, ['रायगड'], 'जान्हवी महेंद्र साठे', 'janhavisathe6@gmail.com', '8879278740'],
  [MWD, DM, ['रत्नागिरी'], 'अमित श्रीपाद सामंत', 'amrut.kokan.div@gmail.com', '9112227669'],
  [NGP, SAKHI, ['वर्धा'], 'सायली अनिरुद्ध कठाळे', 'sayalikathale03@gmail.com', '8788387315'],
  [NSK, DEO, ['नाशिक'], 'संजय शंकरगिर गोसावी', 'gosavisanjay15@gmail.com', '8857073911'],
  [MWD, DEO, ['छत्रपती संभाजीनगर'], 'योगेश भास्करराव रोडे', 'rode.yogesh199@gmail.com', '9403200606'],
  [MWD, DIST, ['छत्रपती संभाजीनगर'], 'अक्षय चंद्रकांत लंबे', 'aclambeoffice@gmail.com', '7350691680'],
  [MWD, DIST, ['बीड'], 'विशाल अशोकराव जोशी', 'vishaljoshi251@gmail.com', '9421173251'],
  [AMR, DIST, ['यवतमाळ'], 'परिक्षीत कमलकिशोर शर्मा', 'parikshitsharma143@gmail.com', '8087248674'],
  [NGP, SAKHI, ['नागपूर'], 'नितु आनंद वसाडकर', 'nvasadkar@gmail.com', '8956119837'],
  [NSK, DEO, ['धुळे'], 'विनोद विश्वेश्वर देशपांडे', 'vinodoffice789@gmail.com', '9403019099'],
  [NSK, DM, ['नाशिक'], 'मंगेश अच्युत खाडीलकर', 'khadilkarmangesh@gmail.com', '9881699155'],
  [MWD, SAKHI, ['छत्रपती संभाजीनगर'], 'मंजु अतुल कुलकर्णी', 'manju.a.kulkarni@gmail.com', '9404593726'],
  [NSK, DIST, ['जळगाव'], 'राजेंद्र भगवानराव कानडे', 'rajendrakanade16@gmail.com', '8237657178'],
  [AMR, DIST, ['बुलढाणा'], 'जिग्नेश शैलेश कमानी', 'jigneshkamani1993@gmail.com', '8308998922'],
  [PUN, DEO, ['सांगली'], 'शैलेंद्र शरद जहागिरदार', 'jahagirdarshailendra@gmail.com', '7972830757'],
  [NSK, MITRA, ['जळगाव'], 'किरण सुरेश शिंपी', 'kiranshimpi89@gmail.com', '9604050630'],
  [PUN, DIST, ['कोल्हापूर'], 'प्रशांत अरुण जोशी', 'prashant3996@gmail.com', '9822414375'],
  [MWD, DEO, ['हिंगोली'], 'दिगंबर भाऊदेव जोशी', 'digjos170@gmail.com', '9890559261'],
  [KOK, DIST, ['मुंबई'], 'राजेश गोपीचंद पवार', 'amrut.mumbaicity@gmail.com', '9892848348'],
  [MWD, MITRA, ['लातूर'], 'प्रशांत विजय कापसे', 'prashantkapse27121997@gmail.com', '9923878803'],
  [NSK, SAKHI, ['नाशिक'], 'हर्षाली प्रसाद पुराणिक', 'harshumalwatkar09@gmail.com', '7840969081'],
  [AMR, DEO, ['यवतमाळ'], 'कामेश दिलीप राखे', 'kameshd.rakhe03@gmail.com', '7020984512'],
  [AMR, SAKHI, ['बुलढाणा'], 'नम्रता प्रणव वाचपे', 'namratawachpe@gmail.com', '9356627306'],
  [NSK, DIST, ['धुळे'], 'हेमंत अरुण पाठक', 'pathak.hemant3217@gmail.com', '9822829555'],
  [AMR, DEO, ['बुलढाणा'], 'नंदकिशोर मोतीराम मगर', 'magarnandu93@gmail.com', '9503698881'],
  [NSK, MITRA, ['नंदुरबार'], 'कार्तिकसिंग जीवनसिंग परदेशी', 'kartikpardeshi18655@gmail.com', '8308246201'],
  [NSK, AMRUT_MITRA, ['नाशिक'], 'अजिंक्य संजय कन्नाल', 'ajinkyakannal@gmail.com', '9665692676'],
  [NSK, DIST, ['नाशिक'], 'दिपक हरिलाल गुप्ता', 'journalist.guptadipak@gmail.com', '9423476929'],
];

export const districtContacts = ROWS.map(([division, role, districts, name, email, phone], i) => ({
  id: `row-${i + 1}`,
  division,
  roles: [role],
  districts,
  name,
  email,
  phone,
}));
