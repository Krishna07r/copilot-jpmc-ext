type Item = {
  name: string;
  owner: string;
  description: string;
  keywords?: string[];
};

const CORPUS: Item[] = [
  { name: "CardAuth",   owner: "payments-platform", description: "AuthN/Z for card flows",            keywords: ["card-auth","cardauth","auth","payments"] },
  { name: "KYCProfile", owner: "risk-kyc",          description: "KYC profiles & risk flags",        keywords: ["kyc","profile","risk","compliance"] },
  { name: "LedgerWrite",owner: "core-ledger",       description: "Idempotent write API for ledger",  keywords: ["ledger","write","accounting","posting"] }
];

// normalize for matching
function norm(s: string) { return (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }

export async function queryInternalAPI(
  params: { kind: "serviceSearch"; q: string },
  _token: { isCancellationRequested: boolean }
): Promise<{ items: Item[] }> {
  const raw = params.q ?? "";
  const q = norm(raw);

  // list all services if user asks to list or query is empty
  if (!q || /^list( all)?( services)?$/.test(q)) {
    return { items: CORPUS.slice() };
  }

  const words = q.split(/\s+/).filter(Boolean);

  // score items by matches in name/desc/keywords
  const scored = CORPUS.map((i) => {
    const name = norm(i.name);
    const desc = norm(i.description);
    const kws = (i.keywords ?? []).map(norm);

    let score = 0;

    // whole-query matches
    if (name.includes(q)) score += 4;
    if (desc.includes(q)) score += 1;
    if (kws.some(k => k.includes(q) || q.includes(k))) score += 3;

    // word-by-word partial credit
    for (const w of words) {
      if (name.includes(w)) score += 2;
      if (desc.includes(w)) score += 1;
      if (kws.some(k => k.includes(w))) score += 2;
    }

    return { item: i, score };
  });

  const matches = scored
    .filter(s => s.score > 0)
    .sort((a,b) => b.score - a.score)
    .map(s => s.item);

  // If absolutely nothing matched, return empty to let the UI print suggestions
  return { items: matches };
}
