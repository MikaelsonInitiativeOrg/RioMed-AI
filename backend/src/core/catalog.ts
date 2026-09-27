export type TestCode = string;

export interface CatalogTest {
  code: TestCode;
  name: string;
  synonyms: string[];
  category: string;
}

export const TEST_CATALOG: readonly CatalogTest[] = [
  { code: "MALARIA_MP", name: "Malaria parasite (MP)", category: "Infection", synonyms: ["malaria", "malaria test", "malaria parasite", "mp", "mp test", "malaria rdt"] },
  { code: "WIDAL", name: "Widal (typhoid)", category: "Infection", synonyms: ["widal", "typhoid", "typhoid test", "widal test"] },
  { code: "FBC", name: "Full blood count", category: "Haematology", synonyms: ["full blood count", "fbc", "cbc", "complete blood count"] },
  { code: "PCV", name: "Packed cell volume (PCV)", category: "Haematology", synonyms: ["pcv", "packed cell volume"] },
  { code: "HIV", name: "HIV screening", category: "Infection", synonyms: ["hiv", "hiv test", "hiv screening"] },
  { code: "HBSAG", name: "Hepatitis B (HBsAg)", category: "Infection", synonyms: ["hepatitis b", "hbsag", "hep b"] },
  { code: "HCV", name: "Hepatitis C", category: "Infection", synonyms: ["hepatitis c", "hcv", "hep c"] },
  { code: "FBS", name: "Fasting blood sugar", category: "Chemistry", synonyms: ["blood sugar", "fasting blood sugar", "fbs", "glucose", "sugar test"] },
  { code: "HBA1C", name: "HbA1c", category: "Chemistry", synonyms: ["hba1c"] },
  { code: "LIPID", name: "Lipid profile", category: "Chemistry", synonyms: ["lipid profile", "cholesterol", "lipid"] },
  { code: "URINALYSIS", name: "Urinalysis", category: "Chemistry", synonyms: ["urinalysis", "urine test"] },
  { code: "PREGNANCY", name: "Pregnancy test", category: "Reproductive", synonyms: ["pregnancy test", "beta hcg"] },
  { code: "GENOTYPE", name: "Genotype", category: "Haematology", synonyms: ["genotype", "sickle cell", "genotype test"] },
  { code: "BLOOD_GROUP", name: "Blood group", category: "Haematology", synonyms: ["blood group", "blood grouping"] },
  { code: "LFT", name: "Liver function test", category: "Chemistry", synonyms: ["liver function", "lft", "liver function test"] },
  { code: "EUCR", name: "Electrolytes, urea & creatinine", category: "Chemistry", synonyms: ["kidney function", "e/u/cr", "eucr", "electrolytes"] },
  { code: "XRAY_CHEST", name: "Chest X-ray", category: "Imaging", synonyms: ["chest x-ray", "chest xray", "chest x ray"] },
  { code: "ULTRASOUND", name: "Ultrasound scan", category: "Imaging", synonyms: ["ultrasound", "scan", "ultrasound scan"] },
  { code: "COVID19", name: "COVID-19 test", category: "Infection", synonyms: ["covid", "covid test", "covid-19"] },
];

const BY_CODE = new Map(TEST_CATALOG.map((t) => [t.code, t]));

export function isKnownTestCode(code: string): boolean {
  return typeof code === "string" && BY_CODE.has(code);
}

export function getTest(code: string): CatalogTest | undefined {
  return BY_CODE.get(code);
}
