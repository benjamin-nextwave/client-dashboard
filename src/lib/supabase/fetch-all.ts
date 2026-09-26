/**
 * Haalt alle rijen van een query op, pagina voor pagina.
 *
 * PostgREST geeft per verzoek hooguit 1000 rijen terug, ook als je om meer vraagt
 * (`.limit(5000)` wordt stil afgekapt). Zonder paginatie vallen er dan zonder
 * foutmelding rijen weg — bij de commissies waren dat juist de nieuwste leads,
 * zodat een net ingevoerde dag niet in de inkomsten verscheen.
 *
 * `build` krijgt het bereik mee en moet een query met een stabiele volgorde
 * teruggeven (sorteer als laatste op `id`), anders kunnen rijen tussen twee
 * pagina's verschuiven.
 */
const PAGE_SIZE = 1000
const MAX_PAGES = 200

export async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const rows: T[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE
    const { data, error } = await build(from, from + PAGE_SIZE - 1)
    if (error) {
      console.error('[fetchAllRows]', error)
      break
    }
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < PAGE_SIZE) break
  }
  return rows
}
