import { useQueries } from '@tanstack/react-query'
import type { PersonalMovie } from '../api/catalog'
import { findMovieByImdbId } from '../api/tmdb'

export function useHydratedMovies(entries: PersonalMovie[], enabled: boolean) {
  const results = useQueries({
    queries: entries.map((entry) => ({
      queryKey: ['tmdb-find', entry.imdbID],
      queryFn: () => findMovieByImdbId(entry.imdbID as string),
      enabled: enabled && Boolean(entry.imdbID),
    })),
  })

  return entries.map((entry, index) => {
    const query = results[index]
    const movie = query?.data
    return {
      entry,
      movie: movie
        ? { ...movie, rating: entry.score as number, own: entry.own }
        : undefined,
      isPending: query?.status === 'pending',
      isError: Boolean(query?.isError),
    }
  })
}
