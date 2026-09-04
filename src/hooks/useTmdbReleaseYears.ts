import { useEffect, useState } from 'react'
import { catalogEntryKey, type PersonalMovie } from '../api/catalog'
import { queryClient } from '../api/query'
import { catalogMovieQueryKey, hydrateCatalogMovie, yearFromDate } from '../api/tmdb'

export function useTmdbReleaseYears(movies: PersonalMovie[], enabled: boolean) {
  const [years, setYears] = useState<Map<string, string>>(() => new Map())
  const [scanned, setScanned] = useState(0)

  useEffect(() => {
    if (!enabled) {
      setYears((current) => (current.size === 0 ? current : new Map()))
      setScanned((current) => (current === 0 ? current : 0))
      return
    }

    let cancelled = false
    const next = new Map<string, string>()
    setYears(new Map())
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
          const year = yearFromDate(movie?.release_date)
          if (year) next.set(catalogEntryKey(entry), year)
        }
        if (index % 8 === 0 || index === movies.length - 1) {
          setYears(new Map(next))
          setScanned(index + 1)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [enabled, movies])

  return {
    years,
    scanned,
    total: movies.length,
    scanning: enabled && scanned < movies.length,
  }
}
