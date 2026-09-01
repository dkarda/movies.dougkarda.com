import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { type PersonalMovie } from '../api/catalog'
import { getGenres } from '../api/tmdb'
import { FilterSelect } from '../components/FilterSelect'
import { LazyMovieGrid } from '../components/LazyMovieGrid'
import { EmptyState, ErrorMessage, Spinner } from '../components/Status'
import { usePersonalCatalog } from '../hooks/usePersonalCatalog'
import { useTmdbGenreIds } from '../hooks/useTmdbGenreIds'
import { hasPublicAuth } from '../lib/config'

const EMPTY_MOVIES: PersonalMovie[] = []

function groupByTmdbGenre(
  movies: PersonalMovie[],
  genreIds: Map<string, number[]>,
  names: Map<number, string>,
) {
  const groups = new Map<string, PersonalMovie[]>()
  for (const movie of movies) {
    const ids = movie.imdbID ? genreIds.get(movie.imdbID) : undefined
    if (!ids?.length) continue
    const seen = new Set<string>()
    for (const id of ids) {
      const name = names.get(id)
      if (!name || seen.has(name)) continue
      seen.add(name)
      const list = groups.get(name) ?? []
      list.push(movie)
      groups.set(name, list)
    }
  }
  return [...groups.entries()]
    .map(([name, list]) => ({
      name,
      movies: [...list].sort(
        (a, b) =>
          (b.score ?? 0) - (a.score ?? 0) || (a.Title ?? '').localeCompare(b.Title ?? ''),
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function RankingsPage() {
  const enabled = hasPublicAuth()
  const catalogQuery = usePersonalCatalog(enabled)
  const [genreId, setGenreId] = useState('')
  const movies = useMemo(
    () =>
      (catalogQuery.data ?? EMPTY_MOVIES).filter(
        (movie) => typeof movie.score === 'number' && movie.score > 0,
      ),
    [catalogQuery.data],
  )
  const genresQuery = useQuery({
    queryKey: ['genres'],
    queryFn: getGenres,
    enabled,
  })
  const genreIndex = useTmdbGenreIds(movies, enabled && catalogQuery.isSuccess && movies.length > 0)
  const names = useMemo(() => {
    const map = new Map<number, string>()
    for (const genre of genresQuery.data?.genres ?? []) {
      map.set(genre.id, genre.name)
    }
    return map
  }, [genresQuery.data])
  const groups = useMemo(
    () => groupByTmdbGenre(movies, genreIndex.genreIds, names),
    [movies, genreIndex.genreIds, names],
  )
  const visibleGroups = useMemo(() => {
    if (!genreId) return groups
    const selectedName = names.get(Number(genreId))
    if (!selectedName) return []
    return groups.filter((group) => group.name === selectedName)
  }, [genreId, groups, names])

  if (!enabled) {
    return (
      <EmptyState title="Add your TMDB credentials">
        <p>Genre rankings need TMDB credentials to look up genres and posters.</p>
      </EmptyState>
    )
  }

  if (catalogQuery.isPending) return <Spinner />
  if (catalogQuery.isError) return <ErrorMessage error={catalogQuery.error} />

  return (
    <section className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Genre rankings</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Scored titles from your catalog, grouped by TMDB genre. A film can appear in more
          than one list. Each section loads posters as it comes into view.
          {genreIndex.scanning
            ? ` Looking up genres ${genreIndex.scanned}/${genreIndex.total}.`
            : ''}
        </p>
      </div>
      {movies.length > 0 ? (
        <form
          className="max-w-xs rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4"
          onSubmit={(event) => event.preventDefault()}
        >
          <FilterSelect
            label="Genre"
            value={genreId}
            onChange={setGenreId}
            options={(genresQuery.data?.genres ?? []).map((genre) => ({
              value: String(genre.id),
              label: genre.name,
            }))}
          />
        </form>
      ) : null}
      {movies.length === 0 ? (
        <EmptyState title="No ranked films yet">
          <p>No catalog titles with a score above 0 were found.</p>
        </EmptyState>
      ) : null}
      {movies.length > 0 && visibleGroups.length === 0 && genreIndex.scanning ? <Spinner /> : null}
      {movies.length > 0 && visibleGroups.length === 0 && !genreIndex.scanning ? (
        <EmptyState title={genreId ? 'No matches' : 'No genres yet'}>
          <p>
            {genreId
              ? 'Nothing scored in that genre yet. Pick All or another genre.'
              : 'TMDB did not return genres for these titles.'}
          </p>
        </EmptyState>
      ) : null}
      {visibleGroups.map((group) => (
        <div key={group.name} className="space-y-4">
          <h2 className="text-xl font-medium text-amber-200">
            {group.name}{' '}
            <span className="text-sm font-normal text-zinc-500">({group.movies.length})</span>
          </h2>
          <LazyMovieGrid entries={group.movies} rootMargin="120px" />
        </div>
      ))}
    </section>
  )
}
