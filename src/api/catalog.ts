/** Live file is movies.json (the path without .json 404s). */
export const PERSONAL_CATALOG_URL = 'https://assets.dougkarda.com/data/movies.json'

/** Cap TMDB lookups while catalog import is under test. Raise this after QA. */
export const PERSONAL_MOVIE_LIMIT = 10000

/**
 * Cards (and TMDB finds) loaded per scroll page. 24 fills about 5 rows on a
 * 5-column desktop grid, or 12 rows on a phone, without a huge first paint.
 */
export const MOVIE_PAGE_SIZE = 24

/** TMDB ~40 requests / 10s; stay well under that while hydrating a page. */
export const TMDB_FIND_CONCURRENCY = 4

export type PersonalMovie = {
  Title?: string
  Year?: string
  Rated?: string
  Genre?: string
  Director?: string
  Actors?: string
  imdbID?: string
  score?: number
  status?: string
  own?: string
  collections?: { collection: string }[]
  toplists?: { listName: string; listRank?: number }[]
}

export async function fetchPersonalCatalog(): Promise<PersonalMovie[]> {
  const res = await fetch(PERSONAL_CATALOG_URL)
  if (!res.ok) {
    throw new Error(`Personal catalog request failed (${res.status})`)
  }
  const data: unknown = await res.json()
  if (!Array.isArray(data)) {
    throw new Error('Personal catalog JSON is not an array')
  }
  return data as PersonalMovie[]
}

export function pickTestCatalogMovies(catalog: PersonalMovie[]): PersonalMovie[] {
  return catalog
    .filter(
      (movie) =>
        typeof movie.Title === 'string' &&
        movie.Title.trim().length > 0 &&
        typeof movie.imdbID === 'string' &&
        movie.imdbID.startsWith('tt'),
    )
    .slice(0, PERSONAL_MOVIE_LIMIT)
}

export function catalogGenres(movie: PersonalMovie): string[] {
  const names = (movie.Genre ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
  return names.length > 0 ? names : ['Uncategorized']
}

export function catalogYear(movie: PersonalMovie): string {
  const match = movie.Year?.match(/\d{4}/)
  return match?.[0] ?? ''
}

export function formatPersonalScore(score: number | null | undefined) {
  if (typeof score !== 'number' || score === 0) return 'TBD'
  return `${score}/10`
}

export function normalizeTitle(title: string) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '')
}

export function matchesTextQuery(movie: PersonalMovie, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  const haystack = [
    movie.Title,
    movie.Director,
    movie.Actors,
    ...(movie.toplists ?? []).map((item) => item.listName),
  ]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ')
    .toLowerCase()
  return haystack.includes(needle)
}

export function listRankFor(movie: PersonalMovie, listName: string) {
  const rank = movie.toplists?.find((item) => item.listName === listName)?.listRank
  return typeof rank === 'number' ? rank : undefined
}

export type CatalogFilters = {
  query: string
  genre: string
  year: string
  collection: string
  toplist: string
  own: string
  sort: 'title' | 'score-desc' | 'score-asc' | 'year-desc' | 'year-asc'
}

export const EMPTY_CATALOG_FILTERS: CatalogFilters = {
  query: '',
  genre: '',
  year: '',
  collection: '',
  toplist: '',
  own: '',
  sort: 'title',
}

function uniqueSorted(values: Iterable<string>) {
  return [...new Set(values)].filter(Boolean).sort((a, b) => a.localeCompare(b))
}

export function catalogFilterOptions(movies: PersonalMovie[]) {
  const genres = new Set<string>()
  const years = new Set<string>()
  const collections = new Set<string>()
  const toplistCounts = new Map<string, number>()
  const owns = new Set<string>()

  for (const movie of movies) {
    for (const genre of catalogGenres(movie)) genres.add(genre)
    const year = catalogYear(movie)
    if (year) years.add(year)
    if (movie.own) owns.add(movie.own)
    for (const item of movie.collections ?? []) {
      if (item.collection) collections.add(item.collection)
    }
    for (const item of movie.toplists ?? []) {
      if (item.listName && item.listName.toLowerCase() !== 'default') {
        toplistCounts.set(item.listName, (toplistCounts.get(item.listName) ?? 0) + 1)
      }
    }
  }

  return {
    genres: uniqueSorted(genres),
    years: [...years].sort((a, b) => Number(b) - Number(a)),
    collections: uniqueSorted(collections),
    toplists: [...toplistCounts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count })),
    owns: uniqueSorted(owns),
  }
}

export function filterCatalog(movies: PersonalMovie[], filters: CatalogFilters) {
  const needle = filters.query.trim().toLowerCase()
  const filtered = movies.filter((movie) => {
    if (needle && !matchesTextQuery(movie, needle)) return false
    if (filters.genre && !catalogGenres(movie).includes(filters.genre)) return false
    if (filters.year && catalogYear(movie) !== filters.year) return false
    if (filters.own && movie.own !== filters.own) return false
    if (filters.collection) {
      const names = (movie.collections ?? []).map((item) => item.collection)
      if (!names.includes(filters.collection)) return false
    }
    if (filters.toplist) {
      const names = (movie.toplists ?? []).map((item) => item.listName)
      if (!names.includes(filters.toplist)) return false
    }
    return true
  })

  return sortCatalog(filtered, filters)
}

function sortYear(movie: PersonalMovie, releaseYearByImdb?: Map<string, string>) {
  const fromTmdb = movie.imdbID ? releaseYearByImdb?.get(movie.imdbID) : undefined
  return Number(fromTmdb || catalogYear(movie) || 0)
}

export function sortCatalog(
  movies: PersonalMovie[],
  filters: CatalogFilters,
  releaseYearByImdb?: Map<string, string>,
) {
  const sorted = [...movies]
  if (filters.toplist) {
    sorted.sort((a, b) => {
      const rankA = listRankFor(a, filters.toplist) ?? -Infinity
      const rankB = listRankFor(b, filters.toplist) ?? -Infinity
      return rankB - rankA || (a.Title ?? '').localeCompare(b.Title ?? '')
    })
  } else if (filters.sort === 'score-desc') {
    sorted.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (a.Title ?? '').localeCompare(b.Title ?? ''))
  } else if (filters.sort === 'score-asc') {
    sorted.sort((a, b) => (a.score ?? 0) - (b.score ?? 0) || (a.Title ?? '').localeCompare(b.Title ?? ''))
  } else if (filters.sort === 'year-desc') {
    sorted.sort(
      (a, b) =>
        sortYear(b, releaseYearByImdb) - sortYear(a, releaseYearByImdb) ||
        (a.Title ?? '').localeCompare(b.Title ?? ''),
    )
  } else if (filters.sort === 'year-asc') {
    sorted.sort((a, b) => {
      const yearA = sortYear(a, releaseYearByImdb) || Infinity
      const yearB = sortYear(b, releaseYearByImdb) || Infinity
      return yearA - yearB || (a.Title ?? '').localeCompare(b.Title ?? '')
    })
  } else {
    sorted.sort((a, b) => (a.Title ?? '').localeCompare(b.Title ?? ''))
  }
  return sorted
}

export const DAILY_SUGGESTION_COUNT = 10
export const DAILY_SUGGESTION_MIN_SCORE = 7
const DAILY_SUGGESTION_KEY = 'movies-daily-suggestions'

export function localDateKey(now = new Date()) {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function hashString(value: string) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleWithSeed<T>(items: T[], seed: string) {
  const rng = mulberry32(hashString(seed))
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function readStoredIds(today: string): string[] | null {
  try {
    const raw = localStorage.getItem(DAILY_SUGGESTION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { date?: string; ids?: string[] }
    if (parsed.date !== today || !Array.isArray(parsed.ids)) return null
    return parsed.ids.filter((id) => typeof id === 'string')
  } catch {
    return null
  }
}

function writeStoredIds(today: string, ids: string[]) {
  try {
    localStorage.setItem(DAILY_SUGGESTION_KEY, JSON.stringify({ date: today, ids }))
  } catch {
    // Ignore quota / private-mode failures; date-seeded shuffle still holds for the day.
  }
}

export function pickDailySuggestions(
  movies: PersonalMovie[],
  count = DAILY_SUGGESTION_COUNT,
): PersonalMovie[] {
  const pool = movies.filter(
    (movie) =>
      typeof movie.score === 'number' &&
      movie.score >= DAILY_SUGGESTION_MIN_SCORE &&
      typeof movie.imdbID === 'string',
  )
  if (pool.length === 0) return []

  const today = localDateKey()
  const byId = new Map(pool.map((movie) => [movie.imdbID as string, movie]))
  const stored = readStoredIds(today)
    ?.map((id) => byId.get(id))
    .filter((movie): movie is PersonalMovie => Boolean(movie))

  if (stored && stored.length > 0) {
    if (stored.length >= Math.min(count, pool.length)) {
      return stored.slice(0, count)
    }
  }

  const picked = shuffleWithSeed(pool, today).slice(0, Math.min(count, pool.length))
  writeStoredIds(
    today,
    picked.map((movie) => movie.imdbID as string),
  )
  return picked
}
