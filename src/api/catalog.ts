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
        typeof movie.imdbID === 'string' &&
        movie.imdbID.startsWith('tt') &&
        typeof movie.score === 'number' &&
        movie.score > 0,
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
  const toplists = new Set<string>()
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
      if (item.listName) toplists.add(item.listName)
    }
  }

  return {
    genres: uniqueSorted(genres),
    years: [...years].sort((a, b) => Number(b) - Number(a)),
    collections: uniqueSorted(collections),
    toplists: uniqueSorted(toplists),
    owns: uniqueSorted(owns),
  }
}

export function filterCatalog(movies: PersonalMovie[], filters: CatalogFilters) {
  const needle = filters.query.trim().toLowerCase()
  const filtered = movies.filter((movie) => {
    if (needle) {
      const haystack = [movie.Title, movie.Director, movie.Actors]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(needle)) return false
    }
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

  const sorted = [...filtered]
  if (filters.sort === 'score-desc') {
    sorted.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (a.Title ?? '').localeCompare(b.Title ?? ''))
  } else if (filters.sort === 'score-asc') {
    sorted.sort((a, b) => (a.score ?? 0) - (b.score ?? 0) || (a.Title ?? '').localeCompare(b.Title ?? ''))
  } else if (filters.sort === 'year-desc') {
    sorted.sort((a, b) => Number(catalogYear(b) || 0) - Number(catalogYear(a) || 0))
  } else if (filters.sort === 'year-asc') {
    sorted.sort((a, b) => Number(catalogYear(a) || 0) - Number(catalogYear(b) || 0))
  } else {
    sorted.sort((a, b) => (a.Title ?? '').localeCompare(b.Title ?? ''))
  }
  return sorted
}
