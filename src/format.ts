// Tidy a few Home Connect run-together words in entity labels so they read
// naturally in the card and its editor (e.g. "Coolingfan runtime" →
// "Cooling fan run time"). Extend the map as more quirks turn up.
const LABEL_FIXES: [RegExp, string][] = [
  [/coolingfan/gi, "Cooling fan"],
  [/runtime/gi, "run time"],
];

export function prettifyLabel(label: string): string {
  let out = label;
  for (const [re, replacement] of LABEL_FIXES) {
    out = out.replace(re, replacement);
  }
  return out;
}
