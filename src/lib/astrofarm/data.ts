import type { Crop, MissionProfile } from "./types";

/**
 * AUDITED crop library and ESM mission profiles.
 *
 * These are the real Table 5 / Table 2 values from AstroFarm_Planner_Architecture.docx,
 * converted into this repo's Crop schema. They replace the earlier reconstructed
 * coefficients. Do not re-derive or "improve" these numbers.
 *
 * Conversions applied (§4 of the architecture doc):
 *   yieldKgPerM2PerDay  = yieldKgPerM2PerCycle / daysToHarvest
 *   powerKwPerM2        = (dli * 1e6 / 2.5 / 3.6e6) / 24 + 0.015
 *                         (2.5 µmol/J LED efficacy; 0.015 kW/m² aux)
 *                         value stored here is for full artificial light;
 *                         model.ts scales it by (1 - naturalLightFrac)
 *   crewHrPerM2PerWeek  = crewMinPerM2PerDay * 7 / 60
 *   systemMassKgPerM2   = 30 (flat, all crops)
 *   riskScore           = §6.1 composite / 100
 *
 * Field provenance:
 *   AUDITED   crl, family, cycleDays, yield, kcalPerKg, dli, heightM, crew time
 *   RECOVERED riskScore — §6.1 composite recomputed from crl / pollination /
 *             microbial / cycle / crew / dli. Reproduces Table 5 to within 0.005.
 *             Pepper, tomato and strawberry are HIGHER than Table 5 prints
 *             (0.530 / 0.610 / 0.820 vs 0.500 / 0.580 / 0.790) because §6.1 scores
 *             pollination at 9 when gravity is zero and Table 5 used 7. Table 5
 *             has the bug; these values are correct for the orbital profile.
 *   ASSUMED   proteinGPerKg, vitScore, waterLPerKg. Table 5 does not print these.
 *             Lettuce waterLPerKg = 20.0 is back-solved from the documented
 *             esm.mass of 63.4. The rest are plausible, not sourced. These are
 *             the weakest numbers in this file — say so if anyone asks.
 *
 * ACCEPTANCE TEST — must hold before trusting any output:
 *   1 m² lettuce, iss_orbital, 1 year:
 *   mass 63.4 · volume 129.3 · power 22.2 · cooling 5.1 · crewTime 3.8 · total 223.8
 *   annual yield 41.7 kg · risk 23.1
 */

export const CROPS: Crop[] = [
  {
    key: "lettuce",
    name: "'Outredgeous' Red Romaine Lettuce",
    category: "leafy",
    family: "Asteraceae",
    crl: 9,
    dli: 17,
    yieldKgPerM2PerDay: 0.11429,
    kcalPerKg: 170,
    proteinGPerKg: 13,
    vitScore: 6.4,
    powerKwPerM2: 0.0937,
    crewHrPerM2PerWeek: 0.0642,
    heightM: 0.35,
    systemMassKgPerM2: 30,
    waterLPerKg: 20.0,
    cycleDays: 28,
    riskScore: 0.231,
  },
  {
    key: "mizuna",
    name: "Mizuna Mustard",
    category: "leafy",
    family: "Brassicaceae",
    crl: 9,
    dli: 16,
    yieldKgPerM2PerDay: 0.125,
    kcalPerKg: 210,
    proteinGPerKg: 22,
    vitScore: 7.8,
    powerKwPerM2: 0.0891,
    crewHrPerM2PerWeek: 0.0583,
    heightM: 0.32,
    systemMassKgPerM2: 30,
    waterLPerKg: 20.0,
    cycleDays: 24,
    riskScore: 0.219,
  },
  {
    key: "kale",
    name: "'Red Russian' Kale",
    category: "leafy",
    family: "Brassicaceae",
    crl: 9,
    dli: 18,
    yieldKgPerM2PerDay: 0.10625,
    kcalPerKg: 350,
    proteinGPerKg: 43,
    vitScore: 9.1,
    powerKwPerM2: 0.0983,
    crewHrPerM2PerWeek: 0.07,
    heightM: 0.4,
    systemMassKgPerM2: 30,
    waterLPerKg: 22.0,
    cycleDays: 32,
    riskScore: 0.242,
  },
  {
    key: "pak_choi",
    name: "'Extra Dwarf' Pak Choi",
    category: "leafy",
    family: "Brassicaceae",
    crl: 9,
    dli: 16,
    yieldKgPerM2PerDay: 0.13846,
    kcalPerKg: 130,
    proteinGPerKg: 15,
    vitScore: 7.0,
    powerKwPerM2: 0.0891,
    crewHrPerM2PerWeek: 0.0583,
    heightM: 0.28,
    systemMassKgPerM2: 30,
    waterLPerKg: 20.0,
    cycleDays: 26,
    riskScore: 0.221,
  },
  {
    key: "radish",
    name: "'Cherry Belle' Radish",
    category: "root",
    family: "Brassicaceae",
    crl: 9,
    dli: 14,
    yieldKgPerM2PerDay: 0.1037,
    kcalPerKg: 160,
    proteinGPerKg: 11,
    vitScore: 5.2,
    powerKwPerM2: 0.0798,
    crewHrPerM2PerWeek: 0.0525,
    heightM: 0.25,
    systemMassKgPerM2: 30,
    waterLPerKg: 18.0,
    cycleDays: 27,
    riskScore: 0.179,
  },
  {
    key: "pepper",
    name: "Española Improved Chile Pepper",
    category: "fruiting",
    family: "Solanaceae",
    crl: 9,
    dli: 24,
    yieldKgPerM2PerDay: 0.04286,
    kcalPerKg: 400,
    proteinGPerKg: 18,
    vitScore: 8.2,
    powerKwPerM2: 0.1261,
    crewHrPerM2PerWeek: 0.1867,
    heightM: 0.6,
    systemMassKgPerM2: 30,
    waterLPerKg: 30.0,
    cycleDays: 105,
    riskScore: 0.53,
  },
  {
    key: "tomato",
    name: "'Red Robin' Dwarf Tomato",
    category: "fruiting",
    family: "Solanaceae",
    crl: 7,
    dli: 23,
    yieldKgPerM2PerDay: 0.06667,
    kcalPerKg: 180,
    proteinGPerKg: 9,
    vitScore: 7.5,
    powerKwPerM2: 0.1215,
    crewHrPerM2PerWeek: 0.175,
    heightM: 0.55,
    systemMassKgPerM2: 30,
    waterLPerKg: 32.0,
    cycleDays: 90,
    riskScore: 0.61,
  },
  {
    key: "wheat",
    name: "'Apogee' Dwarf Wheat",
    category: "grain",
    family: "Poaceae",
    crl: 8,
    dli: 30,
    yieldKgPerM2PerDay: 0.00696,
    kcalPerKg: 3300,
    proteinGPerKg: 130,
    vitScore: 3.0,
    powerKwPerM2: 0.1539,
    crewHrPerM2PerWeek: 0.0817,
    heightM: 0.55,
    systemMassKgPerM2: 30,
    waterLPerKg: 90.0,
    cycleDays: 79,
    riskScore: 0.331,
  },
  {
    key: "soybean",
    name: "Dwarf Soybean",
    category: "legume",
    family: "Fabaceae",
    crl: 5,
    dli: 28,
    yieldKgPerM2PerDay: 0.00433,
    kcalPerKg: 4460,
    proteinGPerKg: 360,
    vitScore: 4.0,
    powerKwPerM2: 0.1446,
    crewHrPerM2PerWeek: 0.0933,
    heightM: 0.5,
    systemMassKgPerM2: 30,
    waterLPerKg: 110.0,
    cycleDays: 97,
    riskScore: 0.457,
  },
  {
    key: "sweet_potato",
    name: "Sweet Potato (dwarf cv.)",
    category: "root",
    family: "Convolvulaceae",
    crl: 4,
    dli: 22,
    yieldKgPerM2PerDay: 0.09167,
    kcalPerKg: 860,
    proteinGPerKg: 16,
    vitScore: 7.4,
    powerKwPerM2: 0.1169,
    crewHrPerM2PerWeek: 0.0758,
    heightM: 0.45,
    systemMassKgPerM2: 30,
    waterLPerKg: 25.0,
    cycleDays: 120,
    riskScore: 0.51,
  },
  {
    key: "potato",
    name: "White Potato (dwarf cv.)",
    category: "root",
    family: "Solanaceae",
    crl: 4,
    dli: 24,
    yieldKgPerM2PerDay: 0.09048,
    kcalPerKg: 770,
    proteinGPerKg: 20,
    vitScore: 6.0,
    powerKwPerM2: 0.1261,
    crewHrPerM2PerWeek: 0.0758,
    heightM: 0.5,
    systemMassKgPerM2: 30,
    waterLPerKg: 26.0,
    cycleDays: 105,
    riskScore: 0.505,
  },
  {
    key: "microgreens",
    name: "Mixed Brassica Microgreens",
    category: "leafy",
    family: "Brassicaceae",
    crl: 6,
    dli: 12,
    yieldKgPerM2PerDay: 0.11,
    kcalPerKg: 250,
    proteinGPerKg: 26,
    vitScore: 9.5,
    powerKwPerM2: 0.0706,
    crewHrPerM2PerWeek: 0.0408,
    heightM: 0.12,
    systemMassKgPerM2: 30,
    waterLPerKg: 16.0,
    cycleDays: 10,
    riskScore: 0.32,
  },
  {
    key: "strawberry",
    name: "Dwarf Strawberry",
    category: "fruiting",
    family: "Rosaceae",
    crl: 3,
    dli: 22,
    yieldKgPerM2PerDay: 0.02,
    kcalPerKg: 320,
    proteinGPerKg: 7,
    vitScore: 8.8,
    powerKwPerM2: 0.1169,
    crewHrPerM2PerWeek: 0.21,
    heightM: 0.35,
    systemMassKgPerM2: 30,
    waterLPerKg: 35.0,
    cycleDays: 110,
    riskScore: 0.82,
  },
  {
    key: "spirulina",
    name: "Spirulina (photobioreactor)",
    category: "algae",
    family: "Cyanobacteria",
    crl: 5,
    dli: 20,
    yieldKgPerM2PerDay: 0.06429,
    kcalPerKg: 2900,
    proteinGPerKg: 570,
    vitScore: 6.5,
    powerKwPerM2: 0.1076,
    crewHrPerM2PerWeek: 0.105,
    heightM: 0.3,
    systemMassKgPerM2: 30,
    waterLPerKg: 40.0,
    cycleDays: 14,
    riskScore: 0.369,
  },
  {
    key: "duckweed",
    name: "Duckweed / Lemna",
    category: "algae",
    family: "Araceae",
    crl: 3,
    dli: 15,
    yieldKgPerM2PerDay: 0.2,
    kcalPerKg: 430,
    proteinGPerKg: 90,
    vitScore: 5.5,
    powerKwPerM2: 0.0844,
    crewHrPerM2PerWeek: 0.0642,
    heightM: 0.15,
    systemMassKgPerM2: 30,
    waterLPerKg: 25.0,
    cycleDays: 12,
    riskScore: 0.43,
  },
];

/**
 * AUDITED — Table 2. Only the Mars-transit column is directly sourced from
 * NASA/TM-2003-212278; lunar and orbital are documented scalings.
 * iss_orbital is the REFERENCE PROFILE for the acceptance test.
 */
export const MISSION_PROFILES: MissionProfile[] = [
  {
    key: "iss_orbital",
    name: "ISS-class orbital",
    missionDays: 365,
    crew: 4,
    volumeEq: 215.5,
    powerEq: 237,
    coolingEq: 60,
    crewTimeEq: 1.14,
    gravity: 0,
    naturalLightFrac: 0,
    notes: "Reference profile. 1 m² lettuce = 223.8 kg-eq, volume 58% of total.",
  },
  {
    key: "lunar_surface",
    name: "Lunar surface outpost",
    missionDays: 730,
    crew: 4,
    volumeEq: 180.0,
    powerEq: 430,
    coolingEq: 90,
    crewTimeEq: 1.14,
    gravity: 0.166,
    naturalLightFrac: 0,
    notes: "~14-day night forces energy storage — power is 1.8x the orbital cost.",
  },
  {
    key: "mars_surface",
    name: "Mars surface",
    missionDays: 1095,
    crew: 6,
    volumeEq: 215.5,
    powerEq: 237,
    coolingEq: 60,
    crewTimeEq: 1.14,
    gravity: 0.38,
    naturalLightFrac: 0.35,
    notes: "Insolation offsets ~35% of the lighting load. No resupply.",
  },
];

export const CROPS_BY_KEY: Record<string, Crop> = Object.fromEntries(
  CROPS.map((crop) => [crop.key, crop]),
);

export const PROFILES_BY_KEY: Record<string, MissionProfile> = Object.fromEntries(
  MISSION_PROFILES.map((profile) => [profile.key, profile]),
);

export const REFERENCE_PROFILE = MISSION_PROFILES.find(
  (profile) => profile.key === "iss_orbital",
) as MissionProfile;

export function getProfile(key: string): MissionProfile {
  return PROFILES_BY_KEY[key] ?? REFERENCE_PROFILE;
}

export function getCrop(key: string): Crop | undefined {
  return CROPS_BY_KEY[key];
}

/** AUDITED §7.1 — kcal per crew member per day used for the coverage metric. */
export const KCAL_TARGET_PER_CREW_DAY = 2500;

/** AUDITED §4.2 — thermal load as a fraction of electrical load. */
export const COOLING_FRACTION = 0.9;

/** AUDITED §4.3 — root zone + service gap added above canopy height, m. */
export const CANOPY_CLEARANCE_M = 0.25;

/** AUDITED §4.3 — closed-loop water recovery; only make-up mass must be launched. */
export const WATER_LOOP_LOSS = 0.04;
