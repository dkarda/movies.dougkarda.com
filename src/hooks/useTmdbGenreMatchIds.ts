import { useEffect, useState } from 'react'
import { catalogEntryKey, type PersonalMovie } from '../api/catalog'
import { queryClient } from '../api/query'
import { catalogMovieQueryKey, hydrateCatalogMovie } from '../api/tmdb'

export function useTmdbGenreMatchIds(movies: PersonalMovie[], genreId: string) {
  const [matchIds, setMatchIds] = useState<Set<string>>(() => new Set())
  const [scanned, setScanned] = useState(0)
  const wanted = Number(genreId)
  const active = Boolean(genreId) && Number.isFinite(wanted)

  useEffect(() => {
    if (!active) {
      setMatchIds((current) => (current.size === 0 ? current : new Set()))
      setScanned((current) => (current === 0 ? current : 0))
      return
    }

    let cancelled = false
    const matches = new Set<string>()
    setMatchIds(new Set())
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
          if (movie?.genre_ids?.includes(wanted)) matches.add(catalogEntryKey(entry))
        }
        if (index % 8 === 0 || index === movies.length - 1) {
          setMatchIds(new Set(matches))
          setScanned(index + 1)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [active, movies, wanted])

  return {
    matchIds,
    scanned,
    total: movies.length,
    scanning: active && scanned < movies.length,
  }
}
