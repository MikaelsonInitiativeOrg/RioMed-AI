import type { TestCode } from "./catalog";

/**
 * Plain-language test glossary (added 2026-09-27, product owner request). General information
 * about what each test measures and how to prepare. It NEVER reads or interprets a patient's own
 * values or reference ranges: that stays with the clinician who ordered or reviews the test.
 */

export interface TestInfo {
  measures: string;
  prepare: string;
}

export const TEST_INFO: Record<TestCode, TestInfo> = {
  MALARIA_MP: { measures: "Looks for malaria parasites in a drop of your blood, usually under a microscope or with a rapid test.", prepare: "No special preparation. Tell the lab if you've already taken malaria medicine." },
  WIDAL: { measures: "Checks your blood for antibodies linked to typhoid fever. On its own it can be misleading, so clinicians often read it with other tests.", prepare: "No special preparation." },
  FBC: { measures: "Counts the main cells in your blood: red cells, white cells and platelets.", prepare: "No special preparation." },
  PCV: { measures: "Measures the share of your blood that is red blood cells. It's one way to check for anaemia.", prepare: "No special preparation." },
  HIV: { measures: "Screens your blood for HIV. Counselling is offered before and after the test.", prepare: "No special preparation. Results are confidential." },
  HBSAG: { measures: "Looks for a protein from the hepatitis B virus in your blood.", prepare: "No special preparation." },
  HCV: { measures: "Looks for antibodies to the hepatitis C virus in your blood.", prepare: "No special preparation." },
  FBS: { measures: "Measures the sugar (glucose) in your blood after not eating.", prepare: "Don't eat or drink anything except water for 8–10 hours before." },
  HBA1C: { measures: "Shows your average blood sugar over the past two to three months.", prepare: "No fasting needed." },
  LIPID: { measures: "Measures fats in your blood, such as cholesterol and triglycerides.", prepare: "The lab may ask you to fast for 9–12 hours. Check when you book." },
  URINALYSIS: { measures: "Checks a urine sample for signs such as infection, sugar or protein.", prepare: "A clean-catch sample from the middle of the stream, often first thing in the morning." },
  PREGNANCY: { measures: "Looks for the pregnancy hormone (hCG) in urine or blood.", prepare: "A morning urine sample works best for urine tests." },
  GENOTYPE: { measures: "Finds your haemoglobin type (for example AA, AS or SS), which matters for sickle cell.", prepare: "No special preparation. You usually only need it once." },
  BLOOD_GROUP: { measures: "Finds your blood group (A, B, AB or O) and Rhesus factor.", prepare: "No special preparation." },
  LFT: { measures: "A group of blood tests that show how well your liver is working.", prepare: "The lab may ask you to fast. Check when you book." },
  EUCR: { measures: "Measures salts, urea and creatinine in your blood to check how your kidneys are working.", prepare: "No special preparation unless the lab says otherwise." },
  XRAY_CHEST: { measures: "A quick picture of your chest that shows the lungs, heart and ribs.", prepare: "Remove jewellery. Tell staff if you might be pregnant." },
  ULTRASOUND: { measures: "Uses sound waves to show organs or a pregnancy on a screen. No radiation.", prepare: "Some scans need a full bladder or fasting. Check when you book." },
  COVID19: { measures: "Looks for the virus that causes COVID-19, usually from a nose or throat swab.", prepare: "No special preparation." },
};

export const TEST_INFO_DISCLAIMER =
  "General information about the test, not about your result. Only a clinician can explain what your own result means for you.";

export function getTestInfo(code: string): TestInfo | undefined {
  return (TEST_INFO as Record<string, TestInfo | undefined>)[code];
}
