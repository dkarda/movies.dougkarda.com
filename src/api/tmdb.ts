import { tmdbEnv } from '../lib/config'
import { normalizeTitle, TMDB_FIND_CONCURRENCY } from './catalog'

const API_BASE = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p'

export type PosterSize = 'w185' | 'w342' | 'w500' | 'original'

export type Movie = {
  id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  vote_count: number
  genre_ids?: number[]
  popularity?: number
}

export type Genre = {
  id: number
  name: string
}

export type Paginated<T> = {
  page: number
  results: T[]
  total_pages: number
  total_results: number
}

export type MovieDetails = Movie & {
  imdb_id?: string | null
  runtime: number | null
  tagline: string
  genres: Genre[]
  credits?: {
    cast: { id: number; name: string; character: string; profile_path: string | null }[]
    crew: { id: number; name: string; job: string }[]
  }
  videos?: {
    results: { id: string; key: string; name: string; site: string; type: string }[]
  }
}

export function posterUrl(
  path: string | null | undefined,
  size: PosterSize = 'w342',
) {
  if (!path) return null
  return `${IMAGE_BASE}/${size}${path}`
}

export function yearFromDate(date: string | undefined) {
  if (!date) return ''
  return date.slice(0, 4)
}

export class TmdbError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function tmdbFetch<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> {
  const { apiKey, token } = tmdbEnv()
  if (!apiKey && !token) {
    throw new Error(
      'Missing TMDB credentials. Add VITE_TMDB_API_KEY or VITE_TMDB_ACCESS_TOKEN to .env',
    )
  }

  const url = new URL(`${API_BASE}${path}`)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }
  if (!token && apiKey) {
    url.searchParams.set('api_key', apiKey)
  }

  const headers: HeadersInit = { Accept: 'application/json' }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(url, { headers })
  if (!res.ok) {
    throw new TmdbError(`TMDB request failed (${res.status})`, res.status)
  }
  return (await res.json()) as T
}

let activeFinds = 0
const findWaiters: Array<() => void> = []

async function withFindSlot<T>(fn: () => Promise<T>): Promise<T> {
  while (activeFinds >= TMDB_FIND_CONCURRENCY) {
    await new Promise<void>((resolve) => {
      findWaiters.push(resolve)
    })
  }
  activeFinds += 1
  try {
    return await fn()
  } finally {
    activeFinds -= 1
    findWaiters.shift()?.()
  }
}

export function searchMovies(query: string, page = 1) {
  return tmdbFetch<Paginated<Movie>>('/search/movie', {
    query,
    include_adult: 'false',
    page,
  })
}

export function discoverMovies(options: {
  page?: number
  genreId?: string
  year?: string
  sortBy?: string
}) {
  return tmdbFetch<Paginated<Movie>>('/discover/movie', {
    include_adult: 'false',
    include_video: 'false',
    language: 'en-US',
    page: options.page ?? 1,
    with_genres: options.genreId,
    primary_release_year: options.year,
    sort_by: options.sortBy || 'popularity.desc',
  })
}

export function getMovie(id: number) {
  return tmdbFetch<MovieDetails>(`/movie/${id}`, {
    append_to_response: 'credits,videos',
    language: 'en-US',
  })
}

export function getGenres() {
  return tmdbFetch<{ genres: Genre[] }>('/genre/movie/list', {
    language: 'en-US',
  })
}

export async function findMovieByImdbId(imdbId: string) {
  return withFindSlot(async () => {
    const data = await tmdbFetch<{ movie_results: Movie[] }>(`/find/${imdbId}`, {
      external_source: 'imdb_id',
      language: 'en-US',
    })
    return data.movie_results[0] ?? null
  })
}

type PersonCredit = {
  id?: number
  title?: string
  original_title?: string
  job?: string
}

function addPersonCredit(
  row: PersonCredit,
  tmdbIds: Set<number>,
  titleKeys: Set<string>,
) {
  if (typeof row.id === 'number') tmdbIds.add(row.id)
  if (row.title) titleKeys.add(normalizeTitle(row.title))
  if (row.original_title) titleKeys.add(normalizeTitle(row.original_title))
}

export async function personCreditIndex(query: string) {
  const data = await tmdbFetch<{ results: { id: number }[] }>('/search/person', {
    query,
    include_adult: 'false',
    language: 'en-US',
  })
  const people = data.results.slice(0, 2)
  const tmdbIds = new Set<number>()
  const titleKeys = new Set<string>()

  for (const person of people) {
    const credits = await tmdbFetch<{
      cast?: PersonCredit[]
      crew?: PersonCredit[]
    }>(`/person/${person.id}/movie_credits`, { language: 'en-US' })

    for (const row of credits.cast ?? []) addPersonCredit(row, tmdbIds, titleKeys)
    for (const row of credits.crew ?? []) {
      if (row.job !== 'Director' && row.job !== 'Writer') continue
      addPersonCredit(row, tmdbIds, titleKeys)
    }
  }

  return { ids: [...tmdbIds], titleKeys: [...titleKeys] }
}

export function youtubeTrailer(details: MovieDetails) {
  const videos = details.videos?.results ?? []
  const trailer =
    videos.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ??
    videos.find((v) => v.site === 'YouTube')
  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null
}
