import { useQueries } from '@tanstack/react-query'
import { hasCatalogLookupId, listRankFor, type PersonalMovie } from '../api/catalog'
import { catalogMovieQueryKey, hydrateCatalogMovie } from '../api/tmdb'

export function useHydratedMovies(
  entries: PersonalMovie[],
  enabled: boolean,
  listName?: string,
) {
  const results = useQueries({
    queries: entries.map((entry) => ({
      queryKey: catalogMovieQueryKey(entry),
      queryFn: () => hydrateCatalogMovie(entry),
      enabled: enabled && hasCatalogLookupId(entry),
    })),
  })

  return entries.map((entry, index) => {
    const query = results[index]
    const movie = query?.data
    const listRank = listName ? listRankFor(entry, listName) : undefined
    return {
      entry,
      movie: movie
        ? {
            ...movie,
            rating: entry.score as number,
            own: entry.own,
            listRank,
            note: entry.notes?.trim() || entry.note?.trim() || undefined,
          }
        : undefined,
      isPending: query?.status === 'pending',
      isError: Boolean(query?.isError),
    }
  })
}
