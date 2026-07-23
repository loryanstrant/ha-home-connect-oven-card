interface ImageMatcher {
  test: (model: string, manufacturer: string) => boolean;
  url: string;
  label: string;
}

export const OVEN_IMAGE_MAP: ImageMatcher[] = [
  {
    label: "Bosch Series 8 HBG7741B1A (60cm Pyrolytic, TFT, Air Fry)",
    test: (m, mfr) =>
      /bosch/i.test(mfr) && /^HBG7741B1/i.test(m),
    // Visually identical to the HBG7341B1 product shot; if you want the exact
    // HBG7741B1A image, set `image_url` in the card config.
    url: "https://media3.bsh-group.com/Cons_EPOS/Product_Shots/1200x/MCSA02080734_HBG7341B1_Backofen_BoschBSH_PGA1.png",
  },
  {
    label: "Bosch Series 8 built-in oven",
    test: (m, mfr) =>
      /bosch/i.test(mfr) && /^HBG?[6-9]/i.test(m),
    url: "https://media3.bsh-group.com/Cons_EPOS/Product_Shots/1200x/MCSA02080734_HBG7341B1_Backofen_BoschBSH_PGA1.png",
  },
  {
    label: "Bosch Series 6 built-in oven",
    test: (m, mfr) =>
      /bosch/i.test(mfr) && /^HB[A-Z]?[5-6]/i.test(m),
    url: "https://media3.bsh-group.com/Cons_EPOS/Product_Shots/1200x/MCSA02080668_HBA5780S6_Backofen_BoschBSH_PGA1.png",
  },
  {
    label: "Bosch Series 4 built-in oven",
    test: (m, mfr) =>
      /bosch/i.test(mfr) && /^HB[A-Z]?[3-4]/i.test(m),
    url: "https://media3.bsh-group.com/Cons_EPOS/Product_Shots/1200x/MCSA02080639_HBF114BS0A_Oven_BoschBSH_PGA1.png",
  },
  {
    label: "Siemens iQ700 built-in oven",
    test: (m, mfr) =>
      /siemens/i.test(mfr) && /^HB[7-9]/i.test(m),
    url: "https://media3.bsh-group.com/Cons_EPOS/Product_Shots/1200x/MCSA02085164_HB778GES1_BO_Siemens_PGA1.png",
  },
  {
    label: "Siemens iQ500 built-in oven",
    test: (m, mfr) =>
      /siemens/i.test(mfr) && /^HB[5-6]/i.test(m),
    url: "https://media3.bsh-group.com/Cons_EPOS/Product_Shots/1200x/MCSA02085073_HB578A0S6_BO_Siemens_PGA1.png",
  },
  {
    label: "Neff N90 Slide&Hide oven",
    test: (m, mfr) =>
      /neff/i.test(mfr) && /^B[4-6][8-9]/i.test(m),
    url: "https://media3.bsh-group.com/Cons_EPOS/Product_Shots/1200x/MCSA02080990_B58CT68H0_Oven_NeffBSH_PGA1.png",
  },
  {
    label: "Neff N70 oven",
    test: (m, mfr) =>
      /neff/i.test(mfr) && /^B[1-3]/i.test(m),
    url: "https://media3.bsh-group.com/Cons_EPOS/Product_Shots/1200x/MCSA02080812_B17CR32N1_Oven_NeffBSH_PGA1.png",
  },
  {
    label: "Gaggenau 200 series oven",
    test: (m, mfr) => /gaggenau/i.test(mfr) && /^BOP/i.test(m),
    url: "https://media3.bsh-group.com/Cons_EPOS/Product_Shots/1200x/MCSA02085241_BOP250112_Oven_GaggenauBSH_PGA1.png",
  },
];

const FALLBACK_BY_MANUFACTURER: Record<string, string> = {
  bosch:
    "https://media3.bsh-group.com/Cons_EPOS/Product_Shots/1200x/MCSA02080734_HBG7341B1_Backofen_BoschBSH_PGA1.png",
  siemens:
    "https://media3.bsh-group.com/Cons_EPOS/Product_Shots/1200x/MCSA02085164_HB778GES1_BO_Siemens_PGA1.png",
  neff: "https://media3.bsh-group.com/Cons_EPOS/Product_Shots/1200x/MCSA02080990_B58CT68H0_Oven_NeffBSH_PGA1.png",
  gaggenau:
    "https://media3.bsh-group.com/Cons_EPOS/Product_Shots/1200x/MCSA02085241_BOP250112_Oven_GaggenauBSH_PGA1.png",
};

export function resolveOvenImage(
  model: string | null,
  manufacturer: string | null,
  modelId: string | null = null
): string | null {
  const m = (model ?? "").trim();
  const mid = (modelId ?? "").trim();
  const mfr = (manufacturer ?? "").trim();
  // Match on model or model_id: the Home Connect Local integration reports a
  // generic model ("Oven") but puts the real model number (e.g. HBG7741B1A)
  // in model_id, whereas the cloud integration uses model. Try both.
  if (m || mid) {
    for (const matcher of OVEN_IMAGE_MAP) {
      if ((m && matcher.test(m, mfr)) || (mid && matcher.test(mid, mfr))) {
        return matcher.url;
      }
    }
  }
  const key = mfr.toLowerCase();
  for (const known of Object.keys(FALLBACK_BY_MANUFACTURER)) {
    if (key.includes(known)) return FALLBACK_BY_MANUFACTURER[known];
  }
  return null;
}
