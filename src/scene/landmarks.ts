export interface LandmarkPreset {
  id: string;
  index: number;
  nameEn: string;
  nameBn: string;
  zoneEn: string;
  zoneBn: string;
  chainageKm: string;
  descriptionEn: string;
  descriptionBn: string;
  highlights: string[];
  cameraPos: [number, number, number];
  targetPos: [number, number, number];
  hitboxCenter: [number, number, number];
  hitboxSize: [number, number, number];
}

export const LANDMARKS: LandmarkPreset[] = [
  {
    id: 'tejgaon-hero',
    index: 1,
    nameEn: 'Niloy Hero Showroom & Nitol Hub, Tejgaon',
    nameBn: 'নিলয় হিরো শোরুম ও নিটল হাব, তেজগাঁও',
    zoneEn: 'Tejgaon Industrial & Petrol Hub',
    zoneBn: 'তেজগাঁও শিল্প এলাকা ও নিটল হাব',
    chainageKm: '0.0 km',
    descriptionEn:
      'Flagship Nitol Niloy Group Hero Motors showroom alongside Nitol Motors, Nitol Electronics, Nitol-Niloy Petrol & CNG Station, Hatirjheel Arch Bridge, Bijoy Sarani overpass, and Dhaka Elevated Expressway.',
    descriptionBn:
      'তেজগাঁওয়ে নিটল নিলয় গ্রুপের হিরো শোরুম, নিটল মোটরস ও ইলেকট্রনিক্স, নিটল-নিলয় পেট্রোল ও সিএনজি স্টেশন, হাতিরঝিল আর্চ ব্রিজ এবং বিজয় সরণি ওভারপাস।',
    highlights: ['Niloy Hero Flagship', 'Nitol Petrol & CNG', 'Tejgaon Loop Roads'],
    cameraPos: [-58, 28, 405],
    targetPos: [24, 7, 330],
    hitboxCenter: [44, 12, 330],
    hitboxSize: [52, 24, 65],
  },
  {
    id: 'mohakhali-flyover',
    index: 2,
    nameEn: 'Mohakhali Flyover, Cancer Hospital & Nitol Tower',
    nameBn: 'মহাখালী ফ্লাইওভার, ক্যান্সার হাসপাতাল ও নিটল টাওয়ার',
    zoneEn: 'Mohakhali — NICRH — Bus Terminal',
    zoneBn: 'মহাখালী মোড় — ক্যান্সার হাসপাতাল',
    chainageKm: '3.2 km',
    descriptionEn:
      'Multi-span Mohakhali Flyover, Nitol Niloy Corporate Tower, National Cancer Research Institute & Hospital (NICRH), Mohakhali Bus Terminal complex, markets, restaurants, and cross-city connectors.',
    descriptionBn:
      'মহাখালী ফ্লাইওভার, নিটল নিলয় কর্পোরেট টাওয়ার, জাতীয় ক্যান্সার গবেষণা হাসপাতাল (NICRH), মহাখালী বাজার ও ক্রস-সিটি সংযোগ সড়ক।',
    highlights: ['Mohakhali Cancer Hospital', 'Nitol Niloy Tower', 'Connected Arterial Grid'],
    cameraPos: [-80, 42, 95],
    targetPos: [35, 10, -5],
    hitboxCenter: [0, 14, 0],
    hitboxSize: [70, 28, 150],
  },
  {
    id: 'banani-gulshan-hatirjheel',
    index: 3,
    nameEn: 'Banani, Gulshan & Hatirjheel Arch Bridge',
    nameBn: 'বনানী, গুলশান ও হাতিরঝিল আর্চ ব্রিজ',
    zoneEn: 'Banani — Gulshan — Hatirjheel',
    zoneBn: 'বনানী — গুলশান — হাতিরঝিল',
    chainageKm: '5.8 km',
    descriptionEn:
      'Dense Banani and Gulshan glass towers, Nitol Cement & Insurance towers, Sheraton Banani, Nitol-Niloy Petrol Station, and the iconic red steel Hatirjheel Bowstring Arch Bridge crossing Hatirjheel Lake.',
    descriptionBn:
      'বনানী ও গুলশানের গ্লাস টাওয়ার, নিটল সিমেন্ট ও ইন্স্যুরেন্স টাওয়ার, শেরাটন হোটেল, পেট্রোল পাম্প এবং হাতিরঝিল লেকের লাল আর্চ ব্রিজ।',
    highlights: ['Hatirjheel Arch Bridge', 'Nitol Cement & Insurance', 'Dense Urban Blocks'],
    cameraPos: [95, 56, 520],
    targetPos: [185, 10, 460],
    hitboxCenter: [185, 18, 460],
    hitboxSize: [140, 36, 220],
  },
  {
    id: 'airport-hsia',
    index: 4,
    nameEn: 'Hazrat Shahjalal International Airport (HSIA)',
    nameBn: 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর ও বিমান',
    zoneEn: 'Airport Road — Terminal 1, 2 & 3',
    zoneBn: 'এয়ারপোর্ট রোড — শাহজালাল বিমানবন্দর',
    chainageKm: '9.5 km',
    descriptionEn:
      'Hazrat Shahjalal International Airport right off Airport Road featuring Terminal 3 wave roof, ATC radar tower, Runway 14/32 with edge beacons, parallel taxiway, jetbridges, and four parked commercial aircraft.',
    descriptionBn:
      'এয়ারপোর্ট রোডের পাশে হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর—টার্মিনাল ৩, এয়ার ট্রাফিক কন্ট্রোল টাওয়ার, রানওয়ে এবং ৪টি পার্ক করা বিমান।',
    highlights: ['4 Parked Commercial Planes', 'Runway 14/32 & ATC Tower', 'Terminal Loop Road'],
    cameraPos: [130, 88, -1040],
    targetPos: [-125, 12, -1120],
    hitboxCenter: [-140, 24, -1120],
    hitboxSize: [200, 48, 360],
  },
  {
    id: 'hospital-hotel-strip',
    index: 5,
    nameEn: 'Kurmitola Hospital, AFMC & Radisson Blu',
    nameBn: 'কুর্মিটোলা হাসপাতাল, এএফএমসি ও র‍্যাডিসন',
    zoneEn: 'Airport Road — Cantonment',
    zoneBn: 'এয়ারপোর্ট রোড — ক্যান্টনমেন্ট',
    chainageKm: '8.4 km',
    descriptionEn:
      'Radisson Blu Dhaka Water Garden on the west and Kurmitola General Hospital with Armed Forces Medical College on the east, linked seamlessly across Cantonment and Gulshan.',
    descriptionBn:
      'এয়ারপোর্ট রোডের পাশে র‍্যাডিসন ব্লু ওয়াটার গার্ডেন, কুর্মিটোলা জেনারেল হাসপাতাল ও আর্মড ফোর্সেস মেডিকেল কলেজ।',
    highlights: ['Radisson Blu', 'Kurmitola Hospital', 'AFMC'],
    cameraPos: [-28, 44, -520],
    targetPos: [10, 10, -640],
    hitboxCenter: [56, 16, -650],
    hitboxSize: [70, 34, 150],
  },
  {
    id: 'kuril-interchange',
    index: 6,
    nameEn: 'Kuril Multi-Loop Flyover & Nitol Petrol Hub',
    nameBn: 'কুড়িল বিশ্বরোড ফ্লাইওভার ও পেট্রোল পাম্প',
    zoneEn: 'Kuril Interchange',
    zoneBn: 'কুড়িল ইন্টারচেঞ্জ',
    chainageKm: '10.6 km',
    descriptionEn:
      'Multi-loop Kuril Flyover connecting Airport Road, Elevated Expressway ramps, Uttara Sectors, Mirpur Pallabi corridor, and the 300 Feet Purbachal Expressway.',
    descriptionBn:
      'এয়ারপোর্ট রোড, এলিভেটেড এক্সপ্রেসওয়ে, উত্তরা সেক্টর এবং পূর্বাচল ৩০০ ফিট এক্সপ্রেসওয়ের সংযোগস্থল কুড়িল ফ্লাইওভার।',
    highlights: ['Flyover Loops', '300ft Gateway', 'Lamp-Post Banners'],
    cameraPos: [-92, 56, -770],
    targetPos: [25, 10, -860],
    hitboxCenter: [0, 14, -860],
    hitboxSize: [120, 30, 120],
  },
  {
    id: 'purbachal-300ft',
    index: 7,
    nameEn: '300 Feet Purbachal Expressway & Sector Grid',
    nameBn: '৩০০ ফিট পূর্বাচল এক্সপ্রেসওয়ে ও আবাসিক এলাকা',
    zoneEn: 'Purbachal Expressway Corridor',
    zoneBn: 'পূর্বাচল ৩০০ ফিট সড়ক',
    chainageKm: '14.5 km',
    descriptionEn:
      'Eight-lane central expressway with connected underpasses reaching Gazipur Ring and South Return, dual water canals, Nitol-Niloy Petrol Station, school/college zones, and dense Purbachal sectors.',
    descriptionBn:
      '৮-লেনের এক্সপ্রেসওয়ে, কানেক্টেড আন্ডারপাস সড়ক, দুই পাশের খাল, নিটল-নিলয় পেট্রোল স্টেশন, স্কুল-কলেজ ইন্ডিকেটর ও ঘনবসতিপূর্ণ সেক্টর ভবন।',
    highlights: ['Connected Underpass Grid', 'Nitol Petrol & School Zones', 'Safety Motto Banners'],
    cameraPos: [285, 50, -765],
    targetPos: [440, 6, -860],
    hitboxCenter: [440, 12, -860],
    hitboxSize: [280, 26, 95],
  },
  {
    id: 'neela-kanchan-loop',
    index: 8,
    nameEn: 'Neela Market, Kanchan Bridge & Narayanganj Loop',
    nameBn: 'নীলা মার্কেট, কাঞ্চন ব্রিজ ও নারায়ণগঞ্জ লুপ',
    zoneEn: 'Purbachal — Kanchan — Return Highway',
    zoneBn: 'পূর্বাচল — কাঞ্চন ব্রিজ — ঢাকা রিটার্ন লুপ',
    chainageKm: '21.5 km',
    descriptionEn:
      'Neela Market bazaar & restaurants beside Balu Bridge, leading across Kanchan Bridge and Narayanganj Return Highway where drivers loop south continuously back into Dhaka.',
    descriptionBn:
      'নীলা মার্কেট, বালু সেতু ও কাঞ্চন ব্রিজ পেরিয়ে নারায়ণগঞ্জ রিটার্ন এক্সপ্রেসওয়ে—যেখান থেকে ঘুরে আবার ঢাকা বা গাজীপুরে ফেরা যায়।',
    highlights: ['Neela Market', 'Kanchan Bridge Loop', 'Narayanganj Return Road'],
    cameraPos: [1395, 58, -735],
    targetPos: [1540, 10, -860],
    hitboxCenter: [1540, 14, -860],
    hitboxSize: [210, 32, 160],
  },
  {
    id: 'uttara-sectors-petrol',
    index: 9,
    nameEn: 'Uttara Sectors 1–14 & Nitol Petrol Station',
    nameBn: 'উত্তরা সেক্টর ১–১৪ ও নিটল-নিলয় পেট্রোল স্টেশন',
    zoneEn: 'Uttara Model Town Sectors Grid',
    zoneBn: 'উত্তরা মডেল টাউন — সেক্টর গ্রিড',
    chainageKm: '13.5 km',
    descriptionEn:
      'Full structured Uttara Sectors 1–14 grid flanking Airport Road and Diabari Metro, packed with repeating sector apartments, schools, mosques, plazas, and Nitol-Niloy Gas & Petrol Station.',
    descriptionBn:
      'এয়ারপোর্ট রোড ও মেট্রোরেল সংলগ্ন উত্তরা সেক্টর ১–১৪ এর পরিকল্পিত রোড গ্রিড, আবাসিক ভবন, স্কুল-কলেজ এবং নিটল-নিলয় পেট্রোল ও সিএনজি পাম্প।',
    highlights: ['Uttara Sectors Grid', 'Nitol-Niloy Petrol & CNG', 'Zero Empty Voids'],
    cameraPos: [65, 68, -1110],
    targetPos: [175, 10, -1240],
    hitboxCenter: [185, 18, -1240],
    hitboxSize: [220, 36, 240],
  },
  {
    id: 'uttara-tongi-gazipur',
    index: 10,
    nameEn: 'Tongi NITA Chassis Plant & Gazipur Ring',
    nameBn: 'টঙ্গী নিটা বাস-ট্রাক চেসিস প্ল্যান্ট ও গাজীপুর রিং',
    zoneEn: 'Tongi NITA Assembly — Gazipur Chowrasta',
    zoneBn: 'টঙ্গী নিটা অ্যাসেম্বলি — গাজীপুর চৌরাস্তা',
    chainageKm: '25.0 km',
    descriptionEn:
      'Nitol Motors & NITA Truck/Bus Chassis Assembly Yard featuring Tata ladder chassis frames and imported Indian engines near Tongi Market, leading to Gazipur Chowrasta Flyover & Outer Ring.',
    descriptionBn:
      'টঙ্গীতে নিটা কোং ও নিটল মোটরসের টাটা ট্রাক-বাস চেসিস অ্যাসেম্বলি ও ভারত থেকে আমদানি করা ইঞ্জিন ইয়ার্ড এবং গাজীপুর চৌরাস্তা রিং রোড।',
    highlights: ['NITA Truck & Bus Chassis', 'India Engine Import Yard', 'Gazipur Ring Flyover'],
    cameraPos: [-110, 56, -1625],
    targetPos: [60, 10, -1725],
    hitboxCenter: [55, 16, -1725],
    hitboxSize: [140, 32, 140],
  },
  {
    id: 'mirpur-60ft-diabari',
    index: 11,
    nameEn: 'Mirpur 10, Diabari & 60 Feet Road',
    nameBn: 'মিরপুর ১০, দিয়াবাড়ি ও ৬০ ফিট রোড',
    zoneEn: 'Mirpur — 60 Feet — Beribadh Ring',
    zoneBn: 'মিরপুর — ৬০ ফিট ও বেড়িবাঁধ',
    chainageKm: '20.0 km',
    descriptionEn:
      'Full Mirpur grid combining Diabari MRT-6 Depot, Mirpur 10 Roundabout, 60 Feet Road, Nitol-Niloy Electronics & Petrol Station, markets, restaurants, and the Beribadh ring loop.',
    descriptionBn:
      'দিয়াবাড়ি মেট্রো ডিপো, মিরপুর ১০ গোলচত্বর, ৬০ ফিট রোড, নিটল-নিলয় ইলেকট্রনিক্স, পেট্রোল পাম্প ও সম্পূর্ণ সংযুক্ত মিরপুর ব্লক।',
    highlights: ['Mirpur 10 & 60 Feet', 'Diabari Metro Depot', 'Dense Infill Blocks'],
    cameraPos: [-225, 58, -330],
    targetPos: [-365, 10, -460],
    hitboxCenter: [-360, 18, -460],
    hitboxSize: [210, 38, 180],
  },
  {
    id: 'dhanmondi-hospitals',
    index: 12,
    nameEn: 'Dhanmondi Lake, Labaid, Popular & Medinova',
    nameBn: 'ধানমন্ডি লেক, ল্যাবএইড, পপুলার ও মেডিনোভা',
    zoneEn: 'Dhanmondi — Satmasjid — Green Road',
    zoneBn: 'ধানমন্ডি — সাতমসজিদ রোড ও হাসপাতাল জোন',
    chainageKm: '29.5 km',
    descriptionEn:
      'Complete Dhanmondi grid across Satmasjid Road, Mirpur Road, and Green Road featuring Dhanmondi Lake, Labaid Specialized & Cancer Hospital, Popular Diagnostic, Medinova Medical, and Nitol Petrol Pump.',
    descriptionBn:
      'সাতমসজিদ রোড, মিরপুর রোড ও গ্রিন রোড ঘিরে ধানমন্ডি লেক, ল্যাবএইড স্পেশালাইজড ও ক্যান্সার হাসপাতাল, পপুলার ডায়াগনস্টিক, মেডিনোভা এবং পেট্রোল স্টেশন।',
    highlights: ['Labaid & Labaid Cancer', 'Popular & Medinova', 'Dhanmondi Lake & Grid'],
    cameraPos: [-295, 62, 740],
    targetPos: [-390, 10, 580],
    hitboxCenter: [-390, 18, 580],
    hitboxSize: [240, 38, 280],
  },
  {
    id: 'sangsad-manikmia',
    index: 13,
    nameEn: 'Jatiya Sangsad Bhaban & Manik Mia Ave',
    nameBn: 'জাতীয় সংসদ ভবন ও মানিক মিয়া এভিনিউ',
    zoneEn: 'Sher-e-Bangla Nagar — Agargaon',
    zoneBn: 'শেরেবাংলা নগর — মানিক মিয়া এভিনিউ',
    chainageKm: '28.0 km',
    descriptionEn:
      'Monumental Jatiya Sangsad Bhaban surrounded by reflecting water and Crescent Lake along Manik Mia Avenue, linked continuously from Beribadh through Farmgate to Tejgaon and Hatirjheel.',
    descriptionBn:
      'জাতীয় সংসদ ভবন, ক্রিসেন্ট লেক, মানিক মিয়া এভিনিউ, শেরেবাংলা নগর হাসপাতাল জোন এবং বিজয় সরণি ওভারপাস।',
    highlights: ['Jatiya Sangsad Bhaban', 'Manik Mia Avenue', 'Zero Dead-End Links'],
    cameraPos: [-280, 56, 405],
    targetPos: [-280, 14, 225],
    hitboxCenter: [-280, 20, 235],
    hitboxSize: [140, 40, 140],
  },
  {
    id: 'shahbagh-dmch-loop',
    index: 14,
    nameEn: 'Shahbagh Mor, DMCH & South Return Loop',
    nameBn: 'শাহবাগ মোড়, ঢাকা মেডিকেল ও রিটার্ন লুপ',
    zoneEn: 'Shahbagh — Panthapath — South Ring',
    zoneBn: 'শাহবাগ — ঢাকা মেডিকেল — সাউথ রিং',
    chainageKm: '32.0 km',
    descriptionEn:
      'Central Shahbagh Mor beside Dhaka Medical College (DMCH), BSMMU, Square Hospital & Karwan Bazar, linking Mirpur Road, Dhanmondi, Tejgaon, and the Narayanganj Southern Expressway.',
    descriptionBn:
      'শাহবাগ মোড়, ঢাকা মেডিকেল ও বিএসএমএমইউ হাসপাতাল, স্কয়ার হাসপাতাল ও সাউথ রিটার্ন হাইওয়ে।',
    highlights: ['DMCH & BSMMU', 'Square Hospital', 'South Return Expressway'],
    cameraPos: [-220, 58, 790],
    targetPos: [-90, 10, 910],
    hitboxCenter: [-100, 16, 900],
    hitboxSize: [190, 36, 180],
  },
];
