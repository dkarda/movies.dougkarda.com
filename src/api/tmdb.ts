import { hasAccountAuth, tmdbEnv } from '../lib/config'
import { TMDB_FIND_CONCURRENCY } from './catalog'

const API_BASE = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p'
const MAX_PAGES = 50

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

async function fetchAllPages<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T[]> {
  const first = await tmdbFetch<Paginated<T>>(path, { ...params, page: 1 })
  const items = [...first.results]
  const lastPage = Math.min(first.total_pages || 1, MAX_PAGES)
  for (let page = 2; page <= lastPage; page += 1) {
    const next = await tmdbFetch<Paginated<T>>(path, { ...params, page })
    items.push(...next.results)
  }
  return items
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

export async function getWatchlist() {
  if (!hasAccountAuth()) {
    throw new Error('Set VITE_TMDB_ACCOUNT_ID plus an API key or access token.')
  }
  const { accountId } = tmdbEnv()
  return fetchAllPages<Movie>(`/account/${accountId}/watchlist/movies`, {
    sort_by: 'created_at.desc',
    language: 'en-US',
  })
}

export async function getFavorites() {
  if (!hasAccountAuth()) {
    throw new Error('Set VITE_TMDB_ACCOUNT_ID plus an API key or access token.')
  }
  const { accountId } = tmdbEnv()
  return fetchAllPages<Movie>(`/account/${accountId}/favorite/movies`, {
    sort_by: 'created_at.desc',
    language: 'en-US',
  })
}

export function youtubeTrailer(details: MovieDetails) {
  const videos = details.videos?.results ?? []
  const trailer =
    videos.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ??
    videos.find((v) => v.site === 'YouTube')
  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null
}
