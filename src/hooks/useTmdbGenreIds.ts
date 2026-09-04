import { useEffect, useState } from 'react'
import { catalogEntryKey, type PersonalMovie } from '../api/catalog'
import { queryClient } from '../api/query'
import { catalogMovieQueryKey, hydrateCatalogMovie } from '../api/tmdb'

export function useTmdbGenreIds(movies: PersonalMovie[], enabled: boolean) {
  const [genreIds, setGenreIds] = useState<Map<string, number[]>>(() => new Map())
  const [scanned, setScanned] = useState(0)

  useEffect(() => {
    if (!enabled) {
      setGenreIds((current) => (current.size === 0 ? current : new Map()))
      setScanned((current) => (current === 0 ? current : 0))
      return
    }

    let cancelled = false
    const next = new Map<string, number[]>()
    setGenreIds(new Map())
    setScanned(0)

    void (async () => {
      for (let index = 0; index < movies.length; index += 1) {
        if (cancelled) return
        const entry = movies[index]
        if (entry) {
          const movie = await queryClient.fetchQuery({
            queryKey: catalogMovieQueryKey(entry),
            queryFn: () => hydrateCatalogMovie(entry),
          })
          next.set(catalogEntryKey(entry), movie?.genre_ids ?? [])
        }
        if (index % 8 === 0 || index === movies.length - 1) {
          setGenreIds(new Map(next))
          setScanned(index + 1)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [enabled, movies])

  return {
    genreIds,
    scanned,
    total: movies.length,
    scanning: enabled && scanned < movies.length,
  }
}
