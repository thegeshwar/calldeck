export interface IndustryOption {
  label: string;
  keyword: string;
}

export const INDUSTRIES: IndustryOption[] = [
  { label: "All Industries", keyword: "" },
  { label: "Accountant", keyword: "accountant" },
  { label: "Auto Repair", keyword: "auto repair" },
  { label: "Chiropractor", keyword: "chiropractor" },
  { label: "Cleaning Services", keyword: "cleaning service" },
  { label: "Dentist", keyword: "dentist" },
  { label: "Electrician", keyword: "electrician" },
  { label: "Gym / Fitness", keyword: "gym" },
  { label: "Hair Salon", keyword: "hair salon" },
  { label: "HVAC", keyword: "hvac" },
  { label: "Insurance", keyword: "insurance agency" },
  { label: "Landscaping", keyword: "landscaping" },
  { label: "Lawyer", keyword: "lawyer" },
  { label: "Pest Control", keyword: "pest control" },
  { label: "Pet Grooming", keyword: "pet grooming" },
  { label: "Plumber", keyword: "plumber" },
  { label: "Real Estate", keyword: "real estate agency" },
  { label: "Restaurant", keyword: "restaurant" },
  { label: "Roofing", keyword: "roofing contractor" },
  { label: "Spa / Wellness", keyword: "spa" },
  { label: "Veterinarian", keyword: "veterinarian" },
];

export const RADIUS_OPTIONS = [
  { label: "5 mi", value: 8047 },
  { label: "10 mi", value: 16093 },
  { label: "15 mi", value: 24140 },
  { label: "25 mi", value: 40234 },
];
