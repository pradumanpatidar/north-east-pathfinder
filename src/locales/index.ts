/**
 * Language registry + translation dictionaries.
 * Adding a language = add an entry here and a dictionary below.
 * Missing keys fall back to English automatically (see src/lib/i18n.tsx).
 */

export interface LanguageMeta {
  code: string;
  /** Native-script label shown to the user. */
  native: string;
  /** English label (used for screen readers / fallback). */
  english: string;
  /** BCP-47 tag used for speech synthesis / recognition. */
  speech: string;
  /** Whether a browser voice for this language is commonly available. */
  voiceSupport: "native" | "transliterated";
}

export const LANGUAGES: LanguageMeta[] = [
  { code: "en", native: "English", english: "English", speech: "en-IN", voiceSupport: "native" },
  { code: "hi", native: "हिन्दी", english: "Hindi", speech: "hi-IN", voiceSupport: "native" },
  { code: "as", native: "অসমীয়া", english: "Assamese", speech: "as-IN", voiceSupport: "native" },
  { code: "bn", native: "বাংলা", english: "Bengali", speech: "bn-IN", voiceSupport: "native" },
  { code: "ne", native: "नेपाली", english: "Nepali", speech: "ne-NP", voiceSupport: "native" },
  { code: "mni", native: "মৈতৈলোন্", english: "Meitei / Manipuri", speech: "bn-IN", voiceSupport: "transliterated" },
  { code: "brx", native: "बर'", english: "Bodo", speech: "hi-IN", voiceSupport: "transliterated" },
  { code: "kha", native: "Khasi", english: "Khasi", speech: "en-IN", voiceSupport: "transliterated" },
  { code: "grt", native: "A·chik", english: "Garo", speech: "en-IN", voiceSupport: "transliterated" },
  { code: "lus", native: "Mizo ṭawng", english: "Mizo", speech: "en-IN", voiceSupport: "transliterated" },
  { code: "trp", native: "Kokborok", english: "Kokborok", speech: "bn-IN", voiceSupport: "transliterated" },
  { code: "njz", native: "Nyishi", english: "Nyishi", speech: "en-IN", voiceSupport: "transliterated" },
  { code: "njo", native: "Ao", english: "Ao", speech: "en-IN", voiceSupport: "transliterated" },
  { code: "nre", native: "Tenyidie", english: "Angami", speech: "en-IN", voiceSupport: "transliterated" },
  { code: "nag", native: "Nagamese", english: "Nagamese", speech: "hi-IN", voiceSupport: "transliterated" },
];

export type TranslationKey = keyof typeof en;

export const en = {
  "app.name": "NER-Route AI",
  "app.tagline": "MDoNER · Smart Freight Movement Optimization",
  "app.greeting": "Welcome to Ner Route AI",
  "app.demoBadge": "DEMO / SIMULATED DATA",

  "nav.group.operations": "Operations",
  "nav.group.risk": "Risk & Safety",
  "nav.group.insights": "Insights",
  "nav.dashboard": "Dashboard",
  "nav.planner": "Smart Route Planner",
  "nav.map": "Live GIS Map",
  "nav.freight": "Freight Management",
  "nav.risk": "Disaster & Risk",
  "nav.incidents": "Road Incidents",
  "nav.accessibility": "Accessibility",
  "nav.alerts": "Alerts",
  "nav.analytics": "Analytics",
  "nav.reports": "Reports",
  "nav.admin": "Admin",
  "nav.toggle": "Toggle navigation",

  "header.role": "Active role",
  "header.theme.light": "Switch to light mode",
  "header.theme.dark": "Switch to dark mode",

  "lang.switch": "Change language",
  "lang.choose": "Choose your language",
  "lang.chooseHint": "Tap a language to hear it and continue",
  "lang.continue": "Continue",

  "voice.read": "Read this page aloud",
  "voice.stop": "Stop reading",
  "voice.listen": "Speak your answer",
  "voice.listening": "Listening…",
  "voice.unsupported": "Voice input is not supported on this device or browser.",

  "sos.button": "SOS",
  "sos.hold": "Hold for 2 seconds to raise an emergency request",
  "sos.title": "Emergency assistance",
  "sos.prompt": "What problem are you facing?",
  "sos.type.landslide": "Landslide",
  "sos.type.rain": "Heavy rain",
  "sos.type.roadblock": "Road block",
  "sos.type.breakdown": "Vehicle breakdown",
  "sos.type.medical": "Medical emergency",
  "sos.type.other": "Other",
  "sos.describe": "Describe the problem",
  "sos.photo": "Add photo",
  "sos.location": "Location",
  "sos.locating": "Getting your location…",
  "sos.locationDenied": "Location permission denied. Your request will be sent without coordinates.",
  "sos.send": "Send emergency request",
  "sos.sent": "Your request has been sent, help is on the way",
  "sos.queued": "You are offline. Your request is saved and will be sent automatically.",
  "sos.status": "Request status",
  "sos.status.sent": "Request sent",
  "sos.status.accepted": "Accepted",
  "sos.status.enroute": "Help en route",
  "sos.status.resolved": "Resolved",
  "sos.responder": "Nearest responder",
  "sos.cancel": "Cancel",

  "conn.online": "ONLINE",
  "conn.limited": "LIMITED CONNECTIVITY",
  "conn.offline": "OFFLINE",
};

type Dict = Partial<Record<TranslationKey, string>>;

const hi: Dict = {
  "app.greeting": "एनईआर रूट एआई में आपका स्वागत है",
  "app.tagline": "मडोनर · स्मार्ट माल परिवहन अनुकूलन",
  "app.demoBadge": "डेमो / अनुरूपित डेटा",
  "nav.group.operations": "संचालन",
  "nav.group.risk": "जोखिम और सुरक्षा",
  "nav.group.insights": "विश्लेषण",
  "nav.dashboard": "डैशबोर्ड",
  "nav.planner": "स्मार्ट मार्ग योजनाकार",
  "nav.map": "लाइव जीआईएस मानचित्र",
  "nav.freight": "माल प्रबंधन",
  "nav.risk": "आपदा और जोखिम",
  "nav.incidents": "सड़क घटनाएँ",
  "nav.accessibility": "पहुँच सूचकांक",
  "nav.alerts": "चेतावनियाँ",
  "nav.analytics": "विश्लेषिकी",
  "nav.reports": "रिपोर्ट",
  "nav.admin": "प्रशासन",
  "lang.switch": "भाषा बदलें",
  "lang.choose": "अपनी भाषा चुनें",
  "lang.chooseHint": "सुनने और आगे बढ़ने के लिए भाषा पर टैप करें",
  "lang.continue": "आगे बढ़ें",
  "voice.read": "यह पृष्ठ पढ़कर सुनाएँ",
  "voice.stop": "पढ़ना रोकें",
  "voice.listen": "बोलकर उत्तर दें",
  "voice.listening": "सुन रहे हैं…",
  "voice.unsupported": "इस डिवाइस पर आवाज़ इनपुट समर्थित नहीं है।",
  "sos.title": "आपातकालीन सहायता",
  "sos.hold": "आपात अनुरोध के लिए 2 सेकंड दबाए रखें",
  "sos.prompt": "आप किस समस्या का सामना कर रहे हैं?",
  "sos.type.landslide": "भूस्खलन",
  "sos.type.rain": "भारी वर्षा",
  "sos.type.roadblock": "सड़क अवरोध",
  "sos.type.breakdown": "वाहन खराबी",
  "sos.type.medical": "चिकित्सा आपातकाल",
  "sos.type.other": "अन्य",
  "sos.describe": "समस्या बताएँ",
  "sos.photo": "फ़ोटो जोड़ें",
  "sos.location": "स्थान",
  "sos.locating": "आपका स्थान प्राप्त किया जा रहा है…",
  "sos.locationDenied": "स्थान की अनुमति अस्वीकृत। अनुरोध बिना निर्देशांक के भेजा जाएगा।",
  "sos.send": "आपात अनुरोध भेजें",
  "sos.sent": "आपका अनुरोध भेज दिया गया है, सहायता रास्ते में है",
  "sos.queued": "आप ऑफ़लाइन हैं। अनुरोध सहेजा गया है और स्वतः भेजा जाएगा।",
  "sos.status": "अनुरोध स्थिति",
  "sos.status.sent": "अनुरोध भेजा गया",
  "sos.status.accepted": "स्वीकृत",
  "sos.status.enroute": "सहायता रास्ते में",
  "sos.status.resolved": "समाधान हुआ",
  "sos.responder": "निकटतम सहायक",
  "sos.cancel": "रद्द करें",
  "conn.online": "ऑनलाइन",
  "conn.limited": "सीमित कनेक्टिविटी",
  "conn.offline": "ऑफ़लाइन",
};

const as: Dict = {
  "app.greeting": "নেৰ ৰুট এআইলৈ আপোনাক স্বাগতম",
  "app.demoBadge": "ডেমো / অনুকৃত তথ্য",
  "nav.group.operations": "পৰিচালনা",
  "nav.group.risk": "বিপদ আৰু সুৰক্ষা",
  "nav.group.insights": "বিশ্লেষণ",
  "nav.dashboard": "ডেশ্বব’ৰ্ড",
  "nav.planner": "স্মাৰ্ট পথ পৰিকল্পক",
  "nav.map": "লাইভ জিআইএছ মানচিত্ৰ",
  "nav.freight": "পণ্য ব্যৱস্থাপনা",
  "nav.risk": "দুৰ্যোগ আৰু বিপদ",
  "nav.incidents": "পথ দুৰ্ঘটনা",
  "nav.accessibility": "প্ৰৱেশযোগ্যতা",
  "nav.alerts": "সতৰ্কবাণী",
  "nav.analytics": "বিশ্লেষিকা",
  "nav.reports": "প্ৰতিবেদন",
  "lang.switch": "ভাষা সলনি কৰক",
  "lang.choose": "আপোনাৰ ভাষা বাছনি কৰক",
  "voice.read": "এই পৃষ্ঠা পঢ়ি শুনাওক",
  "voice.listen": "কৈ উত্তৰ দিয়ক",
  "voice.listening": "শুনি আছোঁ…",
  "sos.title": "জৰুৰীকালীন সহায়",
  "sos.prompt": "আপুনি কি সমস্যাৰ সন্মুখীন হৈছে?",
  "sos.type.landslide": "ভূমিস্খলন",
  "sos.type.rain": "প্ৰবল বৰষুণ",
  "sos.type.roadblock": "পথ অৱৰোধ",
  "sos.type.breakdown": "গাড়ী বিকল",
  "sos.type.medical": "চিকিৎসা জৰুৰীকালীন",
  "sos.type.other": "অন্য",
  "sos.send": "জৰুৰী অনুৰোধ পঠিয়াওক",
  "sos.sent": "আপোনাৰ অনুৰোধ পঠোৱা হৈছে, সহায় আহি আছে",
  "conn.online": "অনলাইন",
  "conn.offline": "অফলাইন",
};

const bn: Dict = {
  "app.greeting": "নের রুট এআই-তে আপনাকে স্বাগতম",
  "app.demoBadge": "ডেমো / অনুকরণকৃত তথ্য",
  "nav.group.operations": "পরিচালনা",
  "nav.group.risk": "ঝুঁকি ও নিরাপত্তা",
  "nav.group.insights": "বিশ্লেষণ",
  "nav.dashboard": "ড্যাশবোর্ড",
  "nav.planner": "স্মার্ট রুট পরিকল্পক",
  "nav.map": "লাইভ জিআইএস মানচিত্র",
  "nav.freight": "পণ্য ব্যবস্থাপনা",
  "nav.risk": "দুর্যোগ ও ঝুঁকি",
  "nav.incidents": "সড়ক দুর্ঘটনা",
  "nav.accessibility": "প্রবেশযোগ্যতা",
  "nav.alerts": "সতর্কতা",
  "nav.analytics": "বিশ্লেষণী",
  "nav.reports": "প্রতিবেদন",
  "lang.switch": "ভাষা পরিবর্তন করুন",
  "lang.choose": "আপনার ভাষা নির্বাচন করুন",
  "voice.read": "এই পৃষ্ঠা পড়ে শোনান",
  "voice.listen": "বলে উত্তর দিন",
  "voice.listening": "শুনছি…",
  "sos.title": "জরুরি সহায়তা",
  "sos.prompt": "আপনি কী সমস্যায় পড়েছেন?",
  "sos.type.landslide": "ভূমিধস",
  "sos.type.rain": "ভারী বৃষ্টি",
  "sos.type.roadblock": "রাস্তা বন্ধ",
  "sos.type.breakdown": "গাড়ি বিকল",
  "sos.type.medical": "চিকিৎসা জরুরি",
  "sos.type.other": "অন্যান্য",
  "sos.send": "জরুরি অনুরোধ পাঠান",
  "sos.sent": "আপনার অনুরোধ পাঠানো হয়েছে, সাহায্য আসছে",
  "conn.online": "অনলাইন",
  "conn.offline": "অফলাইন",
};

const ne: Dict = {
  "app.greeting": "नेर रुट एआईमा स्वागत छ",
  "nav.dashboard": "ड्यासबोर्ड",
  "nav.planner": "स्मार्ट मार्ग योजनाकार",
  "nav.map": "जीआईएस नक्सा",
  "nav.freight": "ढुवानी व्यवस्थापन",
  "nav.risk": "प्रकोप र जोखिम",
  "nav.incidents": "सडक घटना",
  "nav.alerts": "सूचनाहरू",
  "lang.choose": "आफ्नो भाषा छान्नुहोस्",
  "sos.title": "आपतकालीन सहायता",
  "sos.prompt": "तपाईंलाई के समस्या भयो?",
  "sos.sent": "तपाईंको अनुरोध पठाइयो, सहायता आउँदैछ",
  "conn.online": "अनलाइन",
  "conn.offline": "अफलाइन",
};

const mni: Dict = {
  "app.greeting": "NER Route AI da taramna oujari",
  "lang.choose": "Nahakki lon khanbiyu",
  "sos.title": "Awabana mateng",
  "sos.prompt": "Nahakna kari awaba thengnaribage?",
  "sos.sent": "Nahakki koujaba thakhre, mateng laklani",
};

const nag: Dict = {
  "app.greeting": "NER Route AI te apuni ke swagoto",
  "lang.choose": "Apuni laga bhasa basi lobi",
  "sos.title": "Joruri modot",
  "sos.prompt": "Apuni ki problem pai ase?",
  "sos.sent": "Apuni laga request pathai dise, modot ahi ase",
};

const lus: Dict = {
  "app.greeting": "NER Route AI-ah lo lut rawh",
  "lang.choose": "I ṭawng thlang rawh",
  "sos.title": "Ṭanpuina hmanhmawh",
  "sos.prompt": "Eng harsatna nge i tawh?",
  "sos.sent": "I dilna thawn a ni ta, ṭanpuina a lo kal mek",
};

const kha: Dict = {
  "app.greeting": "Khublei ba phi wan sha ka NER Route AI",
  "lang.choose": "Jied ia ka ktien jong phi",
  "sos.title": "Jingiarap harum",
  "sos.prompt": "Kaei ka jingeh ba phi shem?",
  "sos.sent": "La phah ia ka jingkylli jong phi, ka jingiarap ka wan",
};

/** Every registered language resolves through this map; unlisted keys fall back to English. */
export const DICTIONARIES: Record<string, Dict> = {
  en,
  hi,
  as,
  bn,
  ne,
  mni,
  nag,
  lus,
  kha,
  brx: {},
  grt: {},
  trp: {},
  njz: {},
  njo: {},
  nre: {},
};
