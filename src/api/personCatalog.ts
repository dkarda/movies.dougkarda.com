import { normalizeTitle, type PersonalMovie } from './catalog'
import { queryClient } from './query'
import { findMovieByImdbId, personCreditIndex } from './tmdb'

/** Catalog IMDb ids for films that person actually worked on (not just same title). */
export async function catalogImdbIdsForPerson(query: string, movies: PersonalMovie[]) {
  const { ids, titleKeys } = await personCreditIndex(query)
  const tmdbIds = new Set(ids)
  const titles = new Set(titleKeys)
  const matched: string[] = []

  for (const movie of movies) {
    const imdbID = movie.imdbID
    const titleKey = normalizeTitle(movie.Title ?? '')
    if (!imdbID || !titleKey || !titles.has(titleKey)) continue
    const found = await queryClient.fetchQuery({
      queryKey: ['tmdb-find', imdbID],
      queryFn: () => findMovieByImdbId(imdbID),
    })
    if (found && tmdbIds.has(found.id)) matched.push(imdbID)
  }
  return matched
}

export function imdbIdSet(data: unknown) {
  if (Array.isArray(data)) {
    return new Set(data.filter((value): value is string => typeof value === 'string'))
  }
  return new Set<string>()
}
