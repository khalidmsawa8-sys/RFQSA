/**
 * Central Brand Specialization & RFQ Authorization Engine
 * 
 * Provides canonical brand mapping, Arabic/English alias resolution,
 * vendor brand specialization matching, and server-side authorization helpers.
 */

export interface CanonicalBrand {
  id: string;
  nameAr: string;
  nameEn: string;
  country: string;
  aliases: string[];
}

export const CANONICAL_BRANDS: CanonicalBrand[] = [
  // ── JAPANESE BRANDS ──
  {
    id: "toyota",
    nameAr: "تويوتا",
    nameEn: "Toyota",
    country: "Japan",
    aliases: ["تويوتا", "toyota", "تايوتا", "تيوتا", "toy", "كامري", "كورولا", "لاندكروزر", "هايلكس", "يارس", "برادو", "راف4", "فورتشنر", "أفالون"],
  },
  {
    id: "lexus",
    nameAr: "لكزس",
    nameEn: "Lexus",
    country: "Japan",
    aliases: ["لكزس", "lexus", "لكسز", "لكزسس", "es350", "lx600", "rx350", "ls500", "nx300", "gx460"],
  },
  {
    id: "nissan",
    nameAr: "نيسان",
    nameEn: "Nissan",
    country: "Japan",
    aliases: ["نيسان", "nissan", "نيسان موتورز", "باترول", "داتسون", "datsun", "صني", "التيما", "ماكسيما", "اكستريل", "باثفايندر", "نافارا"],
  },
  {
    id: "infiniti",
    nameAr: "إنفينيتي",
    nameEn: "Infiniti",
    country: "Japan",
    aliases: ["انفينيتي", "إنفينيتي", "infiniti", "انفنتي", "إنفنتي", "qx80", "qx60", "qx50", "q50"],
  },
  {
    id: "honda",
    nameAr: "هوندا",
    nameEn: "Honda",
    country: "Japan",
    aliases: ["هوندا", "honda", "أكورد", "اكورد", "سيفيك", "cr-v", "crv", "بايلوت", "hr-v", "اوديسي"],
  },
  {
    id: "mazda",
    nameAr: "مازدا",
    nameEn: "Mazda",
    country: "Japan",
    aliases: ["مازدا", "mazda", "مزد", "مازدة", "مازدا 6", "مازدا 3", "cx-9", "cx-5", "cx9", "cx5", "cx-30"],
  },
  {
    id: "mitsubishi",
    nameAr: "ميتسوبيشي",
    nameEn: "Mitsubishi",
    country: "Japan",
    aliases: ["ميتسوبيشي", "mitsubishi", "متسوبيشي", "مستوبيشي", "باجيرو", "لانسر", "اتراج", "اكليبس", "l200", "اوتلاندر"],
  },
  {
    id: "isuzu",
    nameAr: "إيسوزو",
    nameEn: "Isuzu",
    country: "Japan",
    aliases: ["ايسوزو", "إيسوزو", "isuzu", "اسوزو", "ديماكس", "d-max", "dmax", "ام يو اكس", "mu-x"],
  },
  {
    id: "suzuki",
    nameAr: "سوزوكي",
    nameEn: "Suzuki",
    country: "Japan",
    aliases: ["سوزوكي", "suzuki", "سزوكي", "سوزوكى", "جيمني", "سويفت", "ديزاير", "فيتارا", "بالينو", "ارتيجا"],
  },
  {
    id: "subaru",
    nameAr: "سوبارو",
    nameEn: "Subaru",
    country: "Japan",
    aliases: ["سوبارو", "subaru", "امبريزا", "فورستر", "اوتباك", "كروستريك", "wrx"],
  },
  {
    id: "daihatsu",
    nameAr: "دايهاتسو",
    nameEn: "Daihatsu",
    country: "Japan",
    aliases: ["دايهاتسو", "daihatsu", "داهاتسو", "تيريوس", "سيريون"],
  },

  // ── KOREAN BRANDS ──
  {
    id: "hyundai",
    nameAr: "هيونداي",
    nameEn: "Hyundai",
    country: "Korea",
    aliases: ["هيونداي", "hyundai", "هونداي", "هينداي", "هيونداى", "سوناتا", "النترا", "إلنترا", "توسان", "سنتافي", "سانتافي", "ازيرا", "أزيرا", "اكسنت", "أكسنت", "كريتا", "باليسيد", "h1", "ستاريا"],
  },
  {
    id: "kia",
    nameAr: "كيا",
    nameEn: "Kia",
    country: "Korea",
    aliases: ["كيا", "kia", "كيا موتورز", "كيا موتور", "سبورتاج", "سيلتوس", "كادينزا", "k5", "k8", "سورينتو", "تيلورايد", "سيراتو", "بيكانتو", "كرنفال", "ريو"],
  },
  {
    id: "genesis",
    nameAr: "جينيسيس",
    nameEn: "Genesis",
    country: "Korea",
    aliases: ["جينيسيس", "genesis", "جنسس", "جينسس", "g70", "g80", "g90", "gv70", "gv80"],
  },
  {
    id: "ssangyong",
    nameAr: "سانغ يونغ / كي جي إم",
    nameEn: "SsangYong / KGM",
    country: "Korea",
    aliases: ["سانغ يونغ", "سانغيونغ", "ssangyong", "kgm", "كي جي ام", "ركستون", "توريس", "تيفولي", "كوراندو"],
  },

  // ── AMERICAN BRANDS ──
  {
    id: "ford",
    nameAr: "فورد",
    nameEn: "Ford",
    country: "USA",
    aliases: ["فورد", "ford", "فورد موتور", "توروس", "تورس", "اكسبلورر", "إكسبلورر", "اكسبدشن", "إكسبيديشن", "f150", "f-150", "موستنج", "موستانج", "ايدج", "إيدج", "برونكو", "فيوجن", "رينجر"],
  },
  {
    id: "lincoln",
    nameAr: "لينكون",
    nameEn: "Lincoln",
    country: "USA",
    aliases: ["لينكون", "lincoln", "لينكولن", "لنكولن", "لنكون", "نافيجيتور", "افياتور", "نوتيلوس", "كورسير", "تاون كار"],
  },
  {
    id: "gmc",
    nameAr: "جي إم سي",
    nameEn: "GMC",
    country: "USA",
    aliases: ["جي ام سي", "جي إم سي", "gmc", "جمس", "جنرال موتورز", "g.m.c", "g-m-c", "يوكن", "يوكون", "سييرا", "اكاديا", "تيرين", "سافانا", "دينالي"],
  },
  {
    id: "chevrolet",
    nameAr: "شيفروليه",
    nameEn: "Chevrolet",
    country: "USA",
    aliases: ["شيفروليه", "شفروليه", "chevrolet", "chevy", "شفر", "شفورلية", "تاهو", "سلفرادو", "كابرس", "كابريس", "ماليبو", "سوبربان", "ترافيرس", "بليزر", "كامارو", "كورفيت", "كابتيفا", "امبالا"],
  },
  {
    id: "cadillac",
    nameAr: "كاديلاك",
    nameEn: "Cadillac",
    country: "USA",
    aliases: ["كاديلاك", "cadillac", "كادلك", "كدلك", "اسكاليد", "إسكاليد", "ct5", "ct4", "xt5", "xt6", "xt4"],
  },
  {
    id: "jeep",
    nameAr: "جيب",
    nameEn: "Jeep",
    country: "USA",
    aliases: ["جيب", "jeep", "شيروكي", "جراند شيروكي", "رانجلر", "رانقلر", "كومباس", "جلاديتور", "واجونير"],
  },
  {
    id: "dodge",
    nameAr: "دودج",
    nameEn: "Dodge",
    country: "USA",
    aliases: ["دودج", "dodge", "دوج", "تشارجر", "شارجر", "تشالنجر", "شالنجر", "دورانجو", "دورانقو"],
  },
  {
    id: "ram",
    nameAr: "رام",
    nameEn: "RAM",
    country: "USA",
    aliases: ["رام", "ram", "دودج رام", "dodge ram", "رام 1500", "ram 1500", "ram 2500"],
  },
  {
    id: "chrysler",
    nameAr: "كرايسلر",
    nameEn: "Chrysler",
    country: "USA",
    aliases: ["كرايسلر", "chrysler", "كرايزلر", "كرزلر", "c300", "300c", "باسيفيكا"],
  },
  {
    id: "tesla",
    nameAr: "تسلا",
    nameEn: "Tesla",
    country: "USA",
    aliases: ["تسلا", "tesla", "تيسلا", "موديل 3", "موديل y", "موديل s", "موديل x", "model 3", "model y"],
  },
  {
    id: "hummer",
    nameAr: "همر",
    nameEn: "Hummer",
    country: "USA",
    aliases: ["همر", "hummer", "h2", "h3", "همر ev"],
  },
  {
    id: "lucid",
    nameAr: "لوسيد",
    nameEn: "Lucid",
    country: "USA / Saudi Arabia",
    aliases: ["لوسيد", "lucid", "لوسيد موتورز", "lucid air", "اير", "غرافيتي"],
  },
  {
    id: "buick",
    nameAr: "بيوك",
    nameEn: "Buick",
    country: "USA",
    aliases: ["بيوك", "buick", "رودماستر", "انكليف", "ريغال"],
  },
  {
    id: "mercury",
    nameAr: "ميركوري",
    nameEn: "Mercury",
    country: "USA",
    aliases: ["ميركوري", "mercury", "ماركيز", "جراند ماركيز", "جراند ماركيز فورد", "ماونتنير"],
  },

  // ── GERMAN BRANDS ──
  {
    id: "mercedes_benz",
    nameAr: "مرسيدس بنز",
    nameEn: "Mercedes-Benz",
    country: "Germany",
    aliases: ["مرسيدس", "mercedes", "mercedes-benz", "mercedes benz", "مرسيدس بنز", "مرسيدس-بنز", "بنز", "mb", "s500", "e200", "e300", "c200", "g63", "glc", "gle", "gls", "amg"],
  },
  {
    id: "bmw",
    nameAr: "بي إم دبليو",
    nameEn: "BMW",
    country: "Germany",
    aliases: ["بي ام دبليو", "بي إم دبليو", "bmw", "بي ام", "بيمر", "b.m.w", "الفئة السابعة", "الفئة الخامسة", "الفئة الثالثة", "x5", "x6", "x7", "x3", "730i", "520i"],
  },
  {
    id: "audi",
    nameAr: "أودي",
    nameEn: "Audi",
    country: "Germany",
    aliases: ["اودي", "أودي", "audi", "أودى", "a4", "a6", "a8", "q7", "q8", "q5", "rs"],
  },
  {
    id: "volkswagen",
    nameAr: "فولكس واجن",
    nameEn: "Volkswagen",
    country: "Germany",
    aliases: ["فولكس واجن", "volkswagen", "vw", "فوكس واجن", "فولكسفاجن", "فولكسواجن", "طوارق", "تيجوان", "باسات", "جولف", "تيرامونت"],
  },
  {
    id: "porsche",
    nameAr: "بورش",
    nameEn: "Porsche",
    country: "Germany",
    aliases: ["بورش", "porsche", "بورشه", "بورتشه", "كايين", "باناميرا", "ماكان", "911", "تايكان", "بوكستر"],
  },
  {
    id: "opel",
    nameAr: "أوبل",
    nameEn: "Opel",
    country: "Germany",
    aliases: ["اوبل", "أوبل", "opel", "استرا", "انسجنيا", "كورسا", "جراند لاند"],
  },

  // ── BRITISH BRANDS ──
  {
    id: "land_rover",
    nameAr: "لاند روفر",
    nameEn: "Land Rover",
    country: "UK",
    aliases: ["لاند روفر", "land rover", "land-rover", "landrover", "لاندروفر", "رنج روفر", "range rover", "ديفندر", "defender", "سبورت", "فيلار", "ايفوك", "ديسكفري"],
  },
  {
    id: "jaguar",
    nameAr: "جاكوار",
    nameEn: "Jaguar",
    country: "UK",
    aliases: ["جاكوار", "jaguar", "جكوار", "f-pace", "x-type", "xj", "xf"],
  },
  {
    id: "mini",
    nameAr: "ميني",
    nameEn: "Mini",
    country: "UK",
    aliases: ["ميني", "mini", "ميني كوبر", "mini cooper", "كوبر", "كانتري مان"],
  },
  {
    id: "bentley",
    nameAr: "بنتلي",
    nameEn: "Bentley",
    country: "UK",
    aliases: ["بنتلي", "bentley", "بنتلى", "كونتيننتال", "بينتايجا", "فلاينج سبير"],
  },
  {
    id: "rolls_royce",
    nameAr: "رولز رويس",
    nameEn: "Rolls-Royce",
    country: "UK",
    aliases: ["رولز رويس", "rolls royce", "rolls-royce", "رولزرويس", "فانتوم", "جوست", "كولينان", "رايث"],
  },
  {
    id: "aston_martin",
    nameAr: "أستون مارتن",
    nameEn: "Aston Martin",
    country: "UK",
    aliases: ["استون مارتن", "أستون مارتن", "aston martin", "dbx", "دانتج", "دي بي 11"],
  },

  // ── ITALIAN BRANDS ──
  {
    id: "maserati",
    nameAr: "مازيراتي",
    nameEn: "Maserati",
    country: "Italy",
    aliases: ["مازيراتي", "maserati", "ميزراتي", "ليفانتي", "غيبلي", "كواتروبورتي", "جريكالي"],
  },
  {
    id: "ferrari",
    nameAr: "فيراري",
    nameEn: "Ferrari",
    country: "Italy",
    aliases: ["فيراري", "ferrari", "فراري", "بوروسانجوي", "روما", "f8", "296"],
  },
  {
    id: "lamborghini",
    nameAr: "لامبورغيني",
    nameEn: "Lamborghini",
    country: "Italy",
    aliases: ["لامبورغيني", "lamborghini", "لامبورجيني", "اوروس", "urus", "هوراكان", "افينتادور", "ريفيلتو"],
  },
  {
    id: "alfa_romeo",
    nameAr: "ألفا روميو",
    nameEn: "Alfa Romeo",
    country: "Italy",
    aliases: ["الفا روميو", "ألفا روميو", "alfa romeo", "جوليا", "ستيلفيو", "تونالي"],
  },
  {
    id: "fiat",
    nameAr: "فيات",
    nameEn: "Fiat",
    country: "Italy",
    aliases: ["فيات", "fiat", "فيات 500", "تيبو", "دوبلو"],
  },

  // ── FRENCH BRANDS ──
  {
    id: "peugeot",
    nameAr: "بيجو",
    nameEn: "Peugeot",
    country: "France",
    aliases: ["بيجو", "peugeot", "بوجو", "3008", "5008", "508", "208", "2008", "لاندتريك"],
  },
  {
    id: "renault",
    nameAr: "رينو",
    nameEn: "Renault",
    country: "France",
    aliases: ["رينو", "renault", "رينولت", "داستر", "كوليوس", "ميغان", "سيمبول", "كابتشر", "ترافيك"],
  },
  {
    id: "citroen",
    nameAr: "ستروين",
    nameEn: "Citroën",
    country: "France",
    aliases: ["ستروين", "citroen", "سيتروين", "c3", "c4", "c5 aircross", "برلينقو"],
  },

  // ── SWEDISH & EUROPEAN BRANDS ──
  {
    id: "volvo",
    nameAr: "فولفو",
    nameEn: "Volvo",
    country: "Sweden",
    aliases: ["فولفو", "volvo", "xc90", "xc60", "xc40", "s90", "s60"],
  },
  {
    id: "skoda",
    nameAr: "سكودا",
    nameEn: "Skoda",
    country: "Czech Republic",
    aliases: ["سكودا", "skoda", "اوكتافيا", "كودياك", "سوبيرب", "كاروك"],
  },
  {
    id: "seat",
    nameAr: "سيات",
    nameEn: "Seat",
    country: "Spain",
    aliases: ["سيات", "seat", "ليون", "اتيكا", "تاراكو", "ايبيزا"],
  },

  // ── CHINESE BRANDS (SAUDI MARKET POPULAR) ──
  {
    id: "mg",
    nameAr: "إم جي",
    nameEn: "MG",
    country: "China / UK",
    aliases: ["ام جي", "إم جي", "mg", "ام-جي", "m.g", "morris garages", "mg6", "mg5", "mg zs", "mg rx5", "mg rx8", "mg gt", "mg whale", "mg one"],
  },
  {
    id: "geely",
    nameAr: "جيلي",
    nameEn: "Geely",
    country: "China",
    aliases: ["جيلي", "geely", "جيلى", "كولراي", "امجراند", "مونجارو", "توغيلا", "ازكارا", "ستار راي", "اوكافانجو", "بريفيس"],
  },
  {
    id: "changan",
    nameAr: "تشانجان",
    nameEn: "Changan",
    country: "China",
    aliases: ["تشانجان", "changan", "شانجان", "شنجان", "تشنجان", "cs95", "cs85", "cs75", "cs35", "cs35 plus", "ايدو", "هنتر", "يوني تي", "uni-t", "يوني كيه", "uni-k", "uni-v"],
  },
  {
    id: "haval",
    nameAr: "هافال",
    nameEn: "Haval",
    country: "China",
    aliases: ["هافال", "haval", "h6", "جولايان", "jolion", "دارغو", "dargo", "h9"],
  },
  {
    id: "great_wall",
    nameAr: "جريت وول (GWM)",
    nameEn: "Great Wall (GWM)",
    country: "China",
    aliases: ["جريت وول", "great wall", "gwm", "باور", "poer", "وينجل", "wingle"],
  },
  {
    id: "tank",
    nameAr: "تانك",
    nameEn: "Tank",
    country: "China",
    aliases: ["تانك", "tank", "تانك 300", "tank 300", "تانك 500", "tank 500"],
  },
  {
    id: "chery",
    nameAr: "شيري",
    nameEn: "Chery",
    country: "China",
    aliases: ["شيري", "chery", "شيرى", "تيجو", "tiggo", "تيجو 8", "تيجو 7", "تيجو 4", "اريزو", "arrizo", "اريزو 8"],
  },
  {
    id: "byd",
    nameAr: "بي واي دي",
    nameEn: "BYD",
    country: "China",
    aliases: ["بي واي دي", "byd", "بي واي دى", "بياويدي", "هان", "سونغ", "تانغ", "سيل", "دولفين", "اتول 3", "qin"],
  },
  {
    id: "jetour",
    nameAr: "جيتور",
    nameEn: "Jetour",
    country: "China",
    aliases: ["جيتور", "jetour", "جتور", "داشينج", "dashing", "t2", "x70", "x70 plus", "x90", "x90 plus"],
  },
  {
    id: "hongqi",
    nameAr: "هونشي",
    nameEn: "Hongqi",
    country: "China",
    aliases: ["هونشي", "hongqi", "هونغتشي", "هونغ تشي", "h5", "h9", "hs5", "hs7", "e-hs9", "osado"],
  },
  {
    id: "exeed",
    nameAr: "إكسيد",
    nameEn: "Exeed",
    country: "China",
    aliases: ["اكسيد", "إكسيد", "exeed", "في اكس", "vx", "تي اكس ال", "txl", "ال اكس", "lx", "ار اكس", "rx"],
  },
  {
    id: "baic",
    nameAr: "بايك",
    nameEn: "BAIC",
    country: "China",
    aliases: ["بايك", "baic", "بيك", "bj40", "bj80", "x35", "x7"],
  },
  {
    id: "gac",
    nameAr: "جي إيه سي",
    nameEn: "GAC",
    country: "China",
    aliases: ["جي ايه سي", "جي إيه سي", "gac", "ترامبشي", "trumpchi", "gs8", "gs4", "gs3", "emkoo", "emzoom", "empow", "gn8"],
  },
  {
    id: "jac",
    nameAr: "جاك",
    nameEn: "JAC",
    country: "China",
    aliases: ["جاك", "jac", "شاحنات جاك", "t8", "j7", "s3", "js4"],
  },
  {
    id: "forthing",
    nameAr: "فورثينج",
    nameEn: "Forthing",
    country: "China",
    aliases: ["فورثينج", "forthing", "فورثينق", "تي 5 إيفو", "t5 evo", "يو تور", "u-tour"],
  },
  {
    id: "dongfeng",
    nameAr: "دونغ فينغ",
    nameEn: "Dongfeng",
    country: "China",
    aliases: ["دونغ فينغ", "dongfeng", "دونغفينغ", "دونغ فانغ", "a30", "ax7", "ريتش"],
  },
  {
    id: "foton",
    nameAr: "فوتون",
    nameEn: "Foton",
    country: "China",
    aliases: ["فوتون", "foton", "تونلاند", "tunland", "فيودل", "ترانزيت فوتون"],
  },
  {
    id: "maxus",
    nameAr: "ماكسوس",
    nameEn: "Maxus",
    country: "China",
    aliases: ["ماكسوس", "maxus", "مكسوس", "t60", "t90", "d90", "g10", "v80"],
  },
  {
    id: "omoda",
    nameAr: "أومودا",
    nameEn: "Omoda",
    country: "China",
    aliases: ["اومودا", "أومودا", "omoda", "اومودا c5", "c5", "e5"],
  },
  {
    id: "jaecoo",
    nameAr: "جايكو",
    nameEn: "Jaecoo",
    country: "China",
    aliases: ["جايكو", "jaecoo", "جايكو 7", "j7", "j8"],
  },
  {
    id: "bestune",
    nameAr: "بيستون",
    nameEn: "Bestune",
    country: "China",
    aliases: ["بيستون", "bestune", "بستون", "t77", "t99", "b70"],
  },
  {
    id: "lynk_co",
    nameAr: "لينك أند كو",
    nameEn: "Lynk & Co",
    country: "China / Sweden",
    aliases: ["لينك اند كو", "لينك أند كو", "lynk & co", "lynk and co", "01", "03", "05", "09"],
  },
  {
    id: "zeekr",
    nameAr: "زيكر",
    nameEn: "Zeekr",
    country: "China",
    aliases: ["زيكر", "zeekr", "زيكير", "zeekr 001", "zeekr x", "zeekr 009"],
  },
  {
    id: "kaiyi",
    nameAr: "كايي",
    nameEn: "Kaiyi",
    country: "China",
    aliases: ["كايي", "kaiyi", "كاي", "x3", "e5"],
  },
  {
    id: "soueast",
    nameAr: "ساوإيست",
    nameEn: "Soueast",
    country: "China",
    aliases: ["ساوايست", "ساوإيست", "soueast", "dx3", "dx7"],
  },
  {
    id: "jmc",
    nameAr: "جي إم سي موتورز (JMC)",
    nameEn: "JMC",
    country: "China",
    aliases: ["jmc", "جي ام سي صيني", "فينغوانغ", "فيغاس"],
  },
  {
    id: "rox_motor",
    nameAr: "روكس موتور",
    nameEn: "Rox Motor",
    country: "China",
    aliases: ["روكس", "rox motor", "rox 01", "بولستون"],
  },
  {
    id: "skywell",
    nameAr: "سكاي ويل",
    nameEn: "Skywell",
    country: "China",
    aliases: ["سكاي ويل", "skywell", "سكايويل", "et5"],
  },
];

/**
 * Normalizes text by removing diacritics, extra punctuation, spaces, and converting to lowercase.
 */
export function normalizeBrandString(raw: string): string {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .trim()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\u064B-\u065F\u0670]/g, "") // remove Arabic tashkeel
    .replace(/[-_./\\,\s]+/g, " ")
    .trim();
}

/**
 * Resolves any raw brand string (in Arabic or English, model mention, etc.)
 * to its Canonical Brand ID (e.g. "toyota", "gmc", "mercedes_benz").
 */
export function resolveCanonicalBrandId(rawMake?: string | null): string | null {
  if (!rawMake) return null;
  const clean = normalizeBrandString(rawMake);
  if (!clean) return null;

  // Direct check for "ALL"
  if (clean === "all" || clean === "كل الماركات" || clean === "كافة الماركات" || clean === "جميع الماركات") {
    return "ALL";
  }

  // 1. Exact match on canonical ID
  const directId = CANONICAL_BRANDS.find((b) => b.id === clean || b.id.replace(/_/g, " ") === clean);
  if (directId) return directId.id;

  // 2. Exact match on aliases or names
  for (const b of CANONICAL_BRANDS) {
    if (normalizeBrandString(b.nameAr) === clean || normalizeBrandString(b.nameEn) === clean) {
      return b.id;
    }
    for (const alias of b.aliases) {
      if (normalizeBrandString(alias) === clean) {
        return b.id;
      }
    }
  }

  // 3. Substring / Word match
  for (const b of CANONICAL_BRANDS) {
    for (const alias of b.aliases) {
      const cleanAlias = normalizeBrandString(alias);
      if (cleanAlias.length >= 3) {
        if (clean.includes(cleanAlias) || cleanAlias.includes(clean)) {
          return b.id;
        }
      }
    }
  }

  // If not found in known registry, return cleaned slug
  return clean.replace(/\s+/g, "_");
}

/**
 * Get the Arabic and English display name for any Brand ID or raw string.
 */
export function getBrandDisplayName(rawMakeOrId?: string | null): { nameAr: string; nameEn: string; id: string } {
  if (!rawMakeOrId) return { nameAr: "غير محدد", nameEn: "Unknown", id: "unknown" };
  const canonicalId = resolveCanonicalBrandId(rawMakeOrId);
  const found = CANONICAL_BRANDS.find((b) => b.id === canonicalId);
  if (found) {
    return { nameAr: found.nameAr, nameEn: found.nameEn, id: found.id };
  }
  return { nameAr: rawMakeOrId, nameEn: rawMakeOrId, id: canonicalId || rawMakeOrId };
}

/**
 * Validates whether an RFQ's car make matches a vendor's authorized specializations.
 * 
 * @param rfqMake - The car_make of the RFQ (e.g. "تويوتا", "Toyota", "GMC")
 * @param vendorSpecializedBrands - Array of specialized brand IDs or names in vendor's profile
 * @param specializesInAll - Boolean flag if vendor is configured to receive all brands
 * 
 * @returns boolean - true if authorized, false otherwise
 */
export function isMakeMatchingSpecialization(
  rfqMake?: string | null,
  vendorSpecializedBrands?: string[] | null,
  specializesInAll?: boolean
): boolean {
  // If vendor specializes in all brands explicitly
  if (specializesInAll === true) {
    return true;
  }

  // If specialized_brands array has "ALL"
  if (
    Array.isArray(vendorSpecializedBrands) &&
    vendorSpecializedBrands.some(
      (b) =>
        b === "ALL" ||
        b?.toLowerCase() === "all" ||
        b === "كافة الماركات" ||
        b === "جميع الماركات" ||
        b === "كل الماركات"
    )
  ) {
    return true;
  }

  // If vendor has NO specialization configured at all, allow all brands by default
  if (!vendorSpecializedBrands || !Array.isArray(vendorSpecializedBrands) || vendorSpecializedBrands.length === 0) {
    return true;
  }

  if (!rfqMake) {
    return false;
  }

  // Resolve RFQ brand to canonical ID
  const rfqCanonical = resolveCanonicalBrandId(rfqMake);
  if (!rfqCanonical) return false;

  // Resolve all vendor specialized brands to canonical IDs
  const vendorCanonicalSet = new Set(
    vendorSpecializedBrands.map((b) => resolveCanonicalBrandId(b)).filter(Boolean)
  );

  if (vendorCanonicalSet.has(rfqCanonical)) {
    return true;
  }

  // Secondary fallback: relaxed normalized string containment
  const cleanRfq = normalizeBrandString(rfqMake);
  for (const vb of vendorSpecializedBrands) {
    const cleanVb = normalizeBrandString(vb);
    if (cleanVb && cleanRfq && (cleanRfq.includes(cleanVb) || cleanVb.includes(cleanRfq))) {
      return true;
    }
  }

  return false;
}

/**
 * Filter an array of RFQs server-side for a specific vendor's profile.
 */
export function filterRfqsForVendor<T extends Record<string, any>>(
  rfqs: T[],
  vendorSpecializedBrands?: string[] | null,
  specializesInAll?: boolean
): T[] {
  if (!Array.isArray(rfqs)) return [];
  if (specializesInAll === true) return rfqs;
  if (
    Array.isArray(vendorSpecializedBrands) &&
    vendorSpecializedBrands.some(
      (b) => b === "ALL" || b?.toLowerCase() === "all" || b === "كافة الماركات" || b === "جميع الماركات"
    )
  ) {
    return rfqs;
  }

  if (!vendorSpecializedBrands || vendorSpecializedBrands.length === 0) {
    return rfqs;
  }

  return rfqs.filter((rfq) =>
    isMakeMatchingSpecialization(rfq.car_make, vendorSpecializedBrands, specializesInAll)
  );
}

/**
 * Server-side helper to fetch vendor specialization profile from Supabase.
 */
export async function getVendorSpecializationProfile(
  supabase: any,
  vendorId: string
): Promise<{
  specialized_brands: string[];
  specializes_in_all_brands: boolean;
  specialized_categories: string[];
  specializes_in_all_categories: boolean;
  role: string;
}> {
  if (!vendorId) {
    return {
      specialized_brands: [],
      specializes_in_all_brands: false,
      specialized_categories: [],
      specializes_in_all_categories: true,
      role: "vendor",
    };
  }

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, specialized_brands, specializes_in_all_brands, specialized_categories, specializes_in_all_categories")
      .eq("id", vendorId)
      .maybeSingle();

    if (profile) {
      const brands = Array.isArray(profile.specialized_brands)
        ? profile.specialized_brands
        : typeof profile.specialized_brands === "string"
        ? [profile.specialized_brands]
        : [];
      const categories = Array.isArray(profile.specialized_categories)
        ? profile.specialized_categories
        : typeof profile.specialized_categories === "string"
        ? [profile.specialized_categories]
        : [];

      return {
        specialized_brands: brands,
        specializes_in_all_brands: Boolean(profile.specializes_in_all_brands || brands.length === 0 || brands.includes("ALL")),
        specialized_categories: categories,
        specializes_in_all_categories: profile.specializes_in_all_categories !== false,
        role: profile.role || "vendor",
      };
    }
  } catch (err) {
    console.warn("Failed to fetch vendor specialization profile:", err);
  }

  // Default fallback for demo / test account if no DB record found
  return {
    specialized_brands: ["ALL"],
    specializes_in_all_brands: true,
    specialized_categories: [],
    specializes_in_all_categories: true,
    role: "vendor",
  };
}
