import { useQuery } from '@tanstack/react-query'
import { getRatedMovies } from '../api/tmdb'
import { MovieGrid } from '../components/MovieCard'
import { EmptyState, ErrorMessage, Spinner } from '../components/Status'
import { hasAccountAuth, hasPublicAuth } from '../lib/config'

export function HomePage() {
  const enabled = hasAccountAuth()
  const ratedQuery = useQuery({
    queryKey: ['rated-movies'],
    queryFn: getRatedMovies,
    enabled,
  })

  if (!hasPublicAuth()) {
    return (
      <EmptyState title="Add your TMDB credentials">
        <p>
          Copy <code className="rounded bg-zinc-800 px-1">.env.example</code> to{' '}
          <code className="rounded bg-zinc-800 px-1">.env</code> and set{' '}
          <code className="rounded bg-zinc-800 px-1">VITE_TMDB_API_KEY</code> (and the
          access token + account id for your ratings). Restart the dev server after
          saving.
        </p>
      </EmptyState>
    )
  }

  if (!enabled) {
    return (
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Recent ratings</h1>
        <EmptyState title="Account id needed for your ratings">
          <p>
            Browse still works. To show scores you log on themoviedb.org, add{' '}
            <code className="rounded bg-zinc-800 px-1">VITE_TMDB_ACCOUNT_ID</code> and{' '}
            <code className="rounded bg-zinc-800 px-1">VITE_TMDB_ACCESS_TOKEN</code>.
          </p>
        </EmptyState>
      </section>
    )
  }

  const recent = (ratedQuery.data ?? []).slice(0, 20)

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Recent ratings</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Scores come from your TMDB account. Rate films there, then refresh after the
          cache expires (about 30 minutes) or clear site data.
        </p>
      </div>
      {ratedQuery.isPending ? <Spinner /> : null}
      {ratedQuery.isError ? <ErrorMessage error={ratedQuery.error} /> : null}
      {ratedQuery.isSuccess && recent.length === 0 ? (
        <EmptyState title="No ratings yet">
          <p>
            Rate movies on{' '}
            <a
              className="text-amber-300 underline"
              href="https://www.themoviedb.org"
              target="_blank"
              rel="noreferrer"
            >
              themoviedb.org
            </a>
            , then reload this page.
          </p>
        </EmptyState>
      ) : null}
      {recent.length > 0 ? <MovieGrid movies={recent} /> : null}
    </section>
  )
}
