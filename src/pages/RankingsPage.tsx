import { catalogGenres, PERSONAL_MOVIE_LIMIT, type PersonalMovie } from '../api/catalog'
import { LazyMovieGrid } from '../components/LazyMovieGrid'
import { EmptyState, ErrorMessage, Spinner } from '../components/Status'
import { usePersonalCatalog } from '../hooks/usePersonalCatalog'
import { hasPublicAuth } from '../lib/config'

function groupByGenre(movies: PersonalMovie[]) {
  const groups = new Map<string, PersonalMovie[]>()
  for (const movie of movies) {
    for (const name of catalogGenres(movie)) {
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

  if (!enabled) {
    return (
      <EmptyState title="TMDB key required">
        <p>Genre rankings need TMDB credentials to load posters.</p>
      </EmptyState>
    )
  }

  if (catalogQuery.isPending) return <Spinner />
  if (catalogQuery.isError) return <ErrorMessage error={catalogQuery.error} />

  const groups = groupByGenre(catalogQuery.data ?? [])

  return (
    <section className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Genre rankings</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Your catalog scores, grouped by genre from the JSON file. A film can appear in
          more than one list. Each section loads posters as it comes into view. Capped at{' '}
          {PERSONAL_MOVIE_LIMIT} titles while testing.
        </p>
      </div>
      {groups.length === 0 ? (
        <EmptyState title="No ranked films yet">
          <p>No catalog titles with scores were found.</p>
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
            <LazyMovieGrid entries={group.movies} rootMargin="120px" />
          </div>
        ))
      )}
    </section>
  )
}
