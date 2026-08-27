import { useQuery } from '@tanstack/react-query'
import { getGenres, getRatedMovies, type RatedMovie } from '../api/tmdb'
import { MovieGrid } from '../components/MovieCard'
import { EmptyState, ErrorMessage, Spinner } from '../components/Status'
import { hasAccountAuth } from '../lib/config'

function groupByGenre(
  movies: RatedMovie[],
  genres: { id: number; name: string }[],
) {
  const names = new Map(genres.map((g) => [g.id, g.name]))
  const groups = new Map<string, RatedMovie[]>()
  for (const movie of movies) {
    const ids = movie.genre_ids?.length ? movie.genre_ids : [0]
    for (const id of ids) {
      const name = names.get(id) ?? 'Uncategorized'
      const list = groups.get(name) ?? []
      list.push(movie)
      groups.set(name, list)
    }
  }
  return [...groups.entries()]
    .map(([name, list]) => ({
      name,
      movies: [...list].sort((a, b) => b.rating - a.rating || b.vote_average - a.vote_average),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function RankingsPage() {
  const enabled = hasAccountAuth()
  const ratedQuery = useQuery({
    queryKey: ['rated-movies'],
    queryFn: getRatedMovies,
    enabled,
  })
  const genresQuery = useQuery({
    queryKey: ['genres'],
    queryFn: getGenres,
    enabled,
  })

  if (!enabled) {
    return (
      <EmptyState title="Connect your TMDB account">
        <p>Genre rankings use your TMDB ratings. Set account id and access token in .env.</p>
      </EmptyState>
    )
  }

  if (ratedQuery.isPending || genresQuery.isPending) return <Spinner />
  if (ratedQuery.isError) return <ErrorMessage error={ratedQuery.error} />
  if (genresQuery.isError) return <ErrorMessage error={genresQuery.error} />

  const groups = groupByGenre(ratedQuery.data ?? [], genresQuery.data?.genres ?? [])

  return (
    <section className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Genre rankings</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Your TMDB scores, grouped by genre. A film can appear in more than one list.
        </p>
      </div>
      {groups.length === 0 ? (
        <EmptyState title="No ranked films yet">
          <p>Rate movies on TMDB to populate these lists.</p>
        </EmptyState>
      ) : (
        groups.map((group) => (
          <div key={group.name} className="space-y-4">
            <h2 className="text-xl font-medium text-amber-200">
              {group.name}{' '}
              <span className="text-sm font-normal text-zinc-500">
                ({group.movies.length})
              </span>
            </h2>
            <MovieGrid movies={group.movies} />
          </div>
        ))
      )}
    </section>
  )
}
