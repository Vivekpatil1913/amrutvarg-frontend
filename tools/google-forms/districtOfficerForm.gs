/**
 * Amrut Varg – District Officer Information & Operational Details Form
 *
 * Google Apps Script that builds the Google Form (and its private response
 * sheet) in one run. It is not part of the website build.
 *
 * How to use (run once, signed in to the official department Google account):
 *   1. Open https://script.google.com and create a New project.
 *   2. Replace the contents of Code.gs with this file and save.
 *   3. Select `createDistrictOfficerForm` and click Run. Approve the
 *      permissions Google asks for (Forms, Sheets).
 *   4. Open View → Logs (Execution log). Copy the "Respondent link"
 *      (…/viewform). Never publish the edit link or the sheet link.
 *   5. Put the respondent link in OFFICIAL_LINKS.districtOfficerForm in
 *      src/i18n/translations.js. The website button appears once it is set.
 *
 * Running it again creates a second, separate form — delete any extra copy.
 */

const MAHARASHTRA_DISTRICTS = [
  'Ahilyanagar / अहिल्यानगर',
  'Akola / अकोला',
  'Amravati / अमरावती',
  'Beed / बीड',
  'Bhandara / भंडारा',
  'Buldhana / बुलढाणा',
  'Chandrapur / चंद्रपूर',
  'Chhatrapati Sambhajinagar / छत्रपती संभाजीनगर',
  'Dharashiv / धाराशिव',
  'Dhule / धुळे',
  'Gadchiroli / गडचिरोली',
  'Gondia / गोंदिया',
  'Hingoli / हिंगोली',
  'Jalgaon / जळगाव',
  'Jalna / जालना',
  'Kolhapur / कोल्हापूर',
  'Latur / लातूर',
  'Mumbai City / मुंबई शहर',
  'Mumbai Suburban / मुंबई उपनगर',
  'Nagpur / नागपूर',
  'Nanded / नांदेड',
  'Nandurbar / नंदुरबार',
  'Nashik / नाशिक',
  'Palghar / पालघर',
  'Parbhani / परभणी',
  'Pune / पुणे',
  'Raigad / रायगड',
  'Ratnagiri / रत्नागिरी',
  'Sangli / सांगली',
  'Satara / सातारा',
  'Sindhudurg / सिंधुदुर्ग',
  'Solapur / सोलापूर',
  'Thane / ठाणे',
  'Wardha / वर्धा',
  'Washim / वाशिम',
  'Yavatmal / यवतमाळ',
];

// 10-digit Indian mobile number starting with 6–9.
const MOBILE_PATTERN = '^[6-9][0-9]{9}$';

function createDistrictOfficerForm() {
  const form = FormApp.create('Amrut Varg – District Officer Information & Operational Details Form');
  form.setTitle(
    'Amrut Varg – District Officer Information & Operational Details Form\n' +
      'अमृत वर्ग – जिल्हा अधिकारी माहिती व कार्यान्वयन तपशील फॉर्म',
  );
  form.setDescription(
    'This form is for District Officers / District Coordinators / District Managers of the Amrut Varg initiative. ' +
      'Please submit your official contact information and district-level operational details. The information will be ' +
      'used only for the coordination and administration of Amrut Varg activities and will not be published.\n\n' +
      'हा फॉर्म अमृत वर्ग उपक्रमाचे जिल्हा अधिकारी / जिल्हा समन्वयक / जिल्हा व्यवस्थापक यांच्यासाठी आहे. ' +
      'कृपया आपली अधिकृत संपर्क माहिती आणि जिल्हास्तरीय कार्यान्वयन तपशील सादर करा. ही माहिती केवळ अमृत वर्ग ' +
      'उपक्रमांच्या समन्वय व प्रशासनासाठी वापरली जाईल आणि ती सार्वजनिक केली जाणार नाही.\n\n' +
      '* Required / आवश्यक',
  );

  // Response privacy: respondents cannot see others' answers or a summary,
  // and cannot edit after submitting.
  form.setPublishingSummary(false);
  form.setAllowResponseEdits(false);
  form.setShowLinkToRespondAgain(false);
  form.setProgressBar(true);
  form.setConfirmationMessage(
    'Thank you. Your district information has been submitted successfully and will be used for official Amrut Varg coordination.\n\n' +
      'धन्यवाद. आपली जिल्हा माहिती यशस्वीरित्या सादर झाली असून ती अमृत वर्गाच्या अधिकृत समन्वयासाठी वापरली जाईल.',
  );

  const mobileValidation = FormApp.createTextValidation()
    .requireTextMatchesPattern(MOBILE_PATTERN)
    .setHelpText('Enter a valid 10-digit mobile number. / कृपया वैध १० अंकी मोबाइल क्रमांक भरा.')
    .build();
  const emailValidation = FormApp.createTextValidation()
    .requireTextIsEmail()
    .setHelpText('Enter a valid email address. / कृपया वैध ईमेल पत्ता भरा.')
    .build();
  const countValidation = () =>
    FormApp.createTextValidation()
      .requireWholeNumber()
      .setHelpText('Enter a whole number, or leave blank. / पूर्ण संख्या भरा, किंवा रिकामे ठेवा.')
      .build();

  const text = (title, required, help) => {
    const item = form.addTextItem().setTitle(title).setRequired(required);
    if (help) item.setHelpText(help);
    return item;
  };
  const paragraph = (title) => form.addParagraphTextItem().setTitle(title).setRequired(false);
  const count = (title) =>
    text(title, false, 'Optional — leave blank if not available. / ऐच्छिक — माहिती उपलब्ध नसल्यास रिकामे ठेवा.').setValidation(
      countValidation(),
    );

  // ---------- Section A: Officer Information ----------
  form
    .addSectionHeaderItem()
    .setTitle('Section A: Officer Information / विभाग अ: अधिकारी माहिती');

  text('Full Name / पूर्ण नाव', true);
  text('Designation / पदनाम', true);
  form
    .addListItem()
    .setTitle('District / जिल्हा')
    .setChoiceValues(MAHARASHTRA_DISTRICTS)
    .setRequired(true);
  text('Department or Office Name / विभाग किंवा कार्यालयाचे नाव', false);
  text('Official Mobile Number / अधिकृत मोबाइल क्रमांक', true, '10 digits, without +91 or 0. / +९१ किंवा ० शिवाय १० अंक.')
    .setValidation(mobileValidation);
  text('Official Email Address / अधिकृत ईमेल', true).setValidation(emailValidation);
  paragraph('Office Address / कार्यालयाचा पत्ता');

  // ---------- Section B: District Operations ----------
  form
    .addPageBreakItem()
    .setTitle('Section B: District Operations / विभाग ब: जिल्हा कार्यान्वयन')
    .setHelpText(
      'Counts are optional. Fill in only the figures that are available. / संख्या ऐच्छिक आहेत. उपलब्ध असलेलीच माहिती भरा.',
    );

  form
    .addMultipleChoiceItem()
    .setTitle('District-level Amrut Varg operational status / जिल्हास्तरीय अमृत वर्ग कार्यान्वयन स्थिती')
    .setChoiceValues(['Active / सुरू', 'Planning Stage / नियोजन टप्प्यात', 'Not Yet Started / अद्याप सुरू नाही'])
    .setRequired(true);
  count('Number of active Amrut Varg centres / सुरू असलेल्या अमृत वर्ग केंद्रांची संख्या');
  count('Number of participating schools or housing societies / सहभागी शाळा किंवा गृहनिर्माण संस्थांची संख्या');
  count('Number of registered students / नोंदणीकृत विद्यार्थ्यांची संख्या');
  count('Number of coordinators or volunteers / समन्वयक किंवा स्वयंसेवकांची संख्या');
  paragraph('Current operational challenges / सध्याच्या कार्यान्वयनातील अडचणी');
  paragraph('Support or resources required / आवश्यक मदत किंवा साधने');
  paragraph('Additional remarks / अतिरिक्त सूचना');

  // ---------- Section C: Coordination Details ----------
  form
    .addPageBreakItem()
    .setTitle('Section C: Coordination Details / विभाग क: समन्वय तपशील');

  form
    .addMultipleChoiceItem()
    .setTitle('Preferred official communication method / अधिकृत संपर्काची पसंतीची पद्धत')
    .setChoiceValues(['Phone / फोन', 'Email / ईमेल', 'Both / दोन्ही'])
    .setRequired(true);
  form
    .addListItem()
    .setTitle('Suitable time for official communication / अधिकृत संपर्कासाठी सोयीची वेळ')
    .setChoiceValues([
      'Morning, 10 AM – 1 PM / सकाळी १० ते दुपारी १',
      'Afternoon, 2 PM – 5 PM / दुपारी २ ते सायं. ५',
      'Any time during office hours / कार्यालयीन वेळेत कधीही',
    ])
    .setRequired(false);
  text(
    'Alternate official contact — name and designation / पर्यायी अधिकृत संपर्क — नाव व पदनाम',
    false,
    'Optional — an official colleague who can be contacted in your absence. / ऐच्छिक — आपल्या अनुपस्थितीत संपर्क करता येईल असे अधिकृत सहकारी.',
  );
  text('Alternate official contact — mobile number / पर्यायी अधिकृत संपर्क — मोबाइल क्रमांक', false).setValidation(
    FormApp.createTextValidation()
      .requireTextMatchesPattern(MOBILE_PATTERN)
      .setHelpText('Enter a valid 10-digit mobile number, or leave blank. / वैध १० अंकी मोबाइल क्रमांक भरा, किंवा रिकामे ठेवा.')
      .build(),
  );
  form
    .addCheckboxItem()
    .setTitle('Confirmation / पुष्टी')
    .setChoiceValues([
      'I confirm that the information submitted is accurate and may be used for official Amrut Varg coordination. / ' +
        'मी पुष्टी करतो/करते की सादर केलेली माहिती अचूक आहे आणि ती अमृत वर्गाच्या अधिकृत समन्वयासाठी वापरली जाऊ शकते.',
    ])
    .setRequired(true);

  // Private response sheet, owned by the account that runs this script.
  const sheet = SpreadsheetApp.create('Amrut Varg – District Officer Responses (Private)');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());

  // Newer Forms accounts create forms unpublished; publish so it accepts responses.
  if (typeof form.setPublished === 'function') form.setPublished(true);
  form.setAcceptingResponses(true);

  Logger.log('Respondent link (put this on the website): ' + form.getPublishedUrl());
  Logger.log('Edit link (keep private): ' + form.getEditUrl());
  Logger.log('Response sheet (keep private): ' + sheet.getUrl());
}
