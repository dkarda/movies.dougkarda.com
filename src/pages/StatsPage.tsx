import { catalogGenres, PERSONAL_MOVIE_LIMIT } from '../api/catalog'
import { EmptyState, ErrorMessage, Spinner } from '../components/Status'
import { usePersonalCatalog } from '../hooks/usePersonalCatalog'

export function StatsPage() {
  const catalogQuery = usePersonalCatalog(true)

  if (catalogQuery.isPending) return <Spinner />
  if (catalogQuery.isError) return <ErrorMessage error={catalogQuery.error} />

  const movies = catalogQuery.data ?? []
  if (movies.length === 0) {
    return (
      <EmptyState title="No stats yet">
        <p>No catalog titles with scores were found.</p>
      </EmptyState>
    )
  }

  const avg = movies.reduce((sum, movie) => sum + (movie.score ?? 0), 0) / movies.length
  const histogram = Array.from({ length: 10 }, (_, i) => {
    const score = i + 1
    return { score, count: movies.filter((movie) => Math.round(movie.score ?? 0) === score).length }
  })
  const maxBar = Math.max(...histogram.map((row) => row.count), 1)
  const genreCounts = new Map<string, number>()
  for (const movie of movies) {
    for (const name of catalogGenres(movie)) {
      genreCounts.set(name, (genreCounts.get(name) ?? 0) + 1)
    }
  }
  const genreRows = [...genreCounts.entries()].sort((a, b) => b[1] - a[1])

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Stats</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Computed from your catalog JSON (no TMDB lookups). Capped at {PERSONAL_MOVIE_LIMIT}{' '}
          titles while testing.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Rated" value={String(movies.length)} />
        <StatCard label="Average score" value={avg.toFixed(1)} />
        <StatCard label="Genres touched" value={String(genreRows.length)} />
      </div>
      <div>
        <h2 className="mb-3 text-lg font-medium">Rating histogram</h2>
        <ul className="space-y-2">
          {histogram.map((row) => (
            <li key={row.score} className="flex items-center gap-3 text-sm">
              <span className="w-8 text-zinc-400">{row.score}</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-amber-300"
                  style={{ width: `${(row.count / maxBar) * 100}%` }}
                />
              </div>
              <span className="w-8 text-right text-zinc-400">{row.count}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="mb-3 text-lg font-medium">Genre breakdown</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {genreRows.map(([name, count]) => (
            <li
              key={name}
              className="flex justify-between rounded-lg border border-zinc-800 px-3 py-2 text-sm"
            >
              <span>{name}</span>
              <span className="text-zinc-400">{count}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-amber-200">{value}</p>
    </div>
  )
}
