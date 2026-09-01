import { useEffect, useState } from 'react'
import type { PersonalMovie } from '../api/catalog'
import { queryClient } from '../api/query'
import { findMovieByImdbId } from '../api/tmdb'

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
        const imdbID = movies[index]?.imdbID
        if (imdbID) {
          const movie = await queryClient.fetchQuery({
            queryKey: ['tmdb-find', imdbID],
            queryFn: () => findMovieByImdbId(imdbID),
          })
          if (movie?.genre_ids?.includes(wanted)) matches.add(imdbID)
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
