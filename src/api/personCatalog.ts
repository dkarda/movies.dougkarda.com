import {
  catalogEntryKey,
  catalogImdbId,
  catalogTmdbId,
  normalizeTitle,
  type PersonalMovie,
} from './catalog'
import { queryClient } from './query'
import { catalogMovieQueryKey, hydrateCatalogMovie, personCreditIndex } from './tmdb'

/** Catalog entry keys for films that person actually worked on (not just same title). */
export async function catalogKeysForPerson(query: string, movies: PersonalMovie[]) {
  const { ids, titleKeys } = await personCreditIndex(query)
  const tmdbIds = new Set(ids)
  const titles = new Set(titleKeys)
  const matched: string[] = []

  for (const movie of movies) {
    const titleKey = normalizeTitle(movie.Title ?? '')
    if (!titleKey || !titles.has(titleKey)) continue

    const knownTmdb = catalogTmdbId(movie)
    if (knownTmdb) {
      if (tmdbIds.has(Number(knownTmdb))) matched.push(catalogEntryKey(movie))
      continue
    }

    if (!catalogImdbId(movie)) continue
    const found = await queryClient.fetchQuery({
      queryKey: catalogMovieQueryKey(movie),
      queryFn: () => hydrateCatalogMovie(movie),
    })
    if (found && tmdbIds.has(found.id)) matched.push(catalogEntryKey(movie))
  }
  return matched
}

export function idSet(data: unknown) {
  if (Array.isArray(data)) {
    return new Set(data.filter((value): value is string => typeof value === 'string'))
  }
  return new Set<string>()
}
