import type { Translations } from './nl'

export const hi: Translations = {
  locale: {
    nl: 'डच',
    en: 'अंग्रेज़ी',
    hi: 'हिन्दी',
    chooseLanguage: 'भाषा चुनें',
  },

  nav: {
    overview: 'अवलोकन',
    email: 'ईमेल',
    leads: 'लीड्स',
    preview: 'पूर्वावलोकन',
    dnc: 'DNC',
    contacts: 'संपर्क',
    myCampaign: 'मेरा कैम्पेन',
    contact: 'संपर्क करें',
    settings: 'सेटिंग्स और मदद',
    groupCampaign: 'कैम्पेन',
    groupSupport: 'सहायता',
    signOut: 'साइन आउट',
  },

  common: {
    close: 'बंद करें',
    save: 'सहेजें',
    saved: 'सहेजा गया',
    cancel: 'रद्द करें',
    delete: 'हटाएं',
    add: 'जोड़ें',
    loading: 'लोड हो रहा है...',
    error: 'कुछ गलत हो गया',
    yes: 'हाँ',
    no: 'नहीं',
    back: 'वापस',
    edit: 'संपादित करें',
    view: 'देखें',
    refresh: 'रीफ्रेश',
  },

  campaign: {
    title: 'मेरा कैम्पेन',
    introOnboardingDone:
      'आपकी ऑनबोर्डिंग पूरी हो गई है। सभी दस्तावेज़ नीचे उपलब्ध हैं।',
    introInProgress:
      'अपनी ऑनबोर्डिंग की प्रगति देखें और जहाँ आवश्यक हो वहाँ स्वीकृति दें।',
    onboardingCompleteTitle: 'ऑनबोर्डिंग पूर्ण',
    onboardingCompleteBody:
      'धन्यवाद! सभी चरण पूरे हो गए हैं। हमारी टीम अंतिम तैयारियाँ करेगी।',
  },

  flow: {
    sectionBadge: 'कैम्पेन फ़्लो',
    sectionTitle: 'आपका कैम्पेन कैसा दिखता है?',
    sectionIntro:
      'वह पूरा मार्ग जो एक लीड तय करती है — मेल देखने के लिए उस पर क्लिक करें, या यह जानने के लिए कि उसे कैसे संभाला जाता है किसी एंड-नोड पर क्लिक करें।',
    variantsCount: '{count} प्रकार',
    clickToView: 'मेल देखने के लिए क्लिक करें',
    clickToViewVariants: 'सभी प्रकार देखने के लिए क्लिक करें',
    view: 'देखें',
    deadEnd: 'अंत',
    endOfCampaign: 'कैम्पेन का अंत',
    noResponse: 'कोई जवाब नहीं',
    leadDroppedOff: 'लीड बाहर हो गई',
    positiveOutcome: 'सकारात्मक नतीजा',
    successDeadEndTag: 'अंत · सफलता',
    handledBy: 'द्वारा संभाला जाता है: {role}',
    byYou: 'आपके द्वारा',
    byNextwave: 'Nextwave द्वारा',

    weergave: 'दृश्य',
    template: 'टेम्पलेट (वेरिएबल्स के साथ)',
    filledExample: 'भरा हुआ उदाहरण',
    viewTemplate: 'टेम्पलेट देखें',
    viewFilledExample: 'भरा हुआ उदाहरण देखें',
    subject: 'विषय',
    mailBody: 'मेल का मुख्य भाग',
    noMailContent: 'कोई मेल सामग्री उपलब्ध नहीं।',

    dropoffIntro:
      'ये वे सभी कारण हैं जिनकी वजह से इस बिंदु पर एक लीड कैम्पेन से बाहर हो सकती है।',
    dropoffNoReasons: 'अभी तक कोई विशिष्ट ड्रॉप-ऑफ़ कारण सेट नहीं किए गए हैं।',
    dropoffReasonCount: '{count} कारण',
    dropoffReasonCountSingular: '1 कारण',
    dropoffOutroWithRole:
      'जब कोई लीड उपरोक्त कारणों में से किसी एक से बाहर हो जाती है, तो कैम्पेन की यह शाखा समाप्त हो जाती है और अनुवर्ती कार्रवाई {role} द्वारा की जाती है।',
    dropoffOutroNoRole:
      'जब कोई लीड उपरोक्त कारणों में से किसी एक से बाहर हो जाती है, तो कैम्पेन की यह शाखा समाप्त हो जाती है और कोई आगे की कार्रवाई आवश्यक नहीं है।',

    successWhatHappens: 'क्या होता है?',
    successWithRole:
      'लीड ने सकारात्मक प्रतिक्रिया दी और यहाँ से {role} द्वारा संभाला जाएगा। इस संपर्क के लिए कैम्पेन रुक जाता है।',
    successNoRole:
      'लीड ने सकारात्मक प्रतिक्रिया दी। इस संपर्क के लिए कैम्पेन रुक जाता है और आगे संभाला जाता है।',
  },
}
