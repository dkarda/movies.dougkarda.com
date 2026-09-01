import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MOVIE_PAGE_SIZE, type PersonalMovie } from '../api/catalog'
import { useHydratedMovies } from '../hooks/useHydratedMovies'
import { MovieCard } from './MovieCard'
import { Spinner } from './Status'

function MovieCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
      <div className="aspect-[2/3] animate-pulse bg-zinc-800" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-4/5 animate-pulse rounded bg-zinc-800" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-800" />
      </div>
    </div>
  )
}

function useInViewOnce(rootMargin = '800px') {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || inView) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true)
      },
      { rootMargin, threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [inView, rootMargin])

  return { ref, inView }
}

export function LazyMovieGrid({
  entries,
  rootMargin = '800px',
  listName,
}: {
  entries: PersonalMovie[]
  rootMargin?: string
  listName?: string
}) {
  const { ref, inView } = useInViewOnce(rootMargin)
  const [shown, setShown] = useState(MOVIE_PAGE_SIZE)
  const slice = inView ? entries.slice(0, shown) : []
  const rows = useHydratedMovies(slice, inView, listName)
  const hasMore = shown < entries.length
  const sentinelRef = useRef<HTMLDivElement>(null)
  const listKey = [
    listName ?? '',
    String(entries.length),
    ...entries.slice(0, MOVIE_PAGE_SIZE).map((entry) => entry.imdbID ?? ''),
    entries.at(-1)?.imdbID ?? '',
  ].join(':')

  useEffect(() => {
    setShown(MOVIE_PAGE_SIZE)
  }, [listKey])

  useEffect(() => {
    if (!inView || !hasMore) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown((count) => Math.min(count + MOVIE_PAGE_SIZE, entries.length))
        }
      },
      { rootMargin: '600px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [inView, hasMore, entries.length])

  if (entries.length === 0) {
    return <p className="text-sm text-zinc-400">No movies to show.</p>
  }

  return (
    <div ref={ref}>
      {inView ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {rows.map((row) => {
            if (row.movie) {
              return (
                <li key={row.entry.imdbID ?? row.movie.id}>
                  <MovieCard movie={row.movie} />
                </li>
              )
            }
            if (row.isPending) {
              return (
                <li key={row.entry.imdbID}>
                  <MovieCardSkeleton />
                </li>
              )
            }
            return null
          })}
        </ul>
      ) : (
        <div className="h-24" aria-hidden="true" />
      )}
      {inView && hasMore ? (
        <div ref={sentinelRef} className="mt-4 flex justify-center">
          <Spinner />
        </div>
      ) : null}
    </div>
  )
}
