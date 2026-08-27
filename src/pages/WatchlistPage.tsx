import { useQuery } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { getFavorites, getWatchlist } from '../api/tmdb'
import { MovieGrid } from '../components/MovieCard'
import { EmptyState, ErrorMessage, Spinner } from '../components/Status'
import { hasAccountAuth } from '../lib/config'

type Tab = 'watchlist' | 'favorites'

export function WatchlistPage() {
  const [tab, setTab] = useState<Tab>('watchlist')
  const enabled = hasAccountAuth()

  const watchQuery = useQuery({
    queryKey: ['watchlist'],
    queryFn: getWatchlist,
    enabled,
  })
  const favQuery = useQuery({
    queryKey: ['favorites'],
    queryFn: getFavorites,
    enabled,
  })

  if (!enabled) {
    return (
      <EmptyState title="Connect your TMDB account">
        <p>Watchlist and favorites are read from your TMDB account (read-only).</p>
      </EmptyState>
    )
  }

  const active = tab === 'watchlist' ? watchQuery : favQuery

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Saved films</h1>
      <div className="flex gap-2">
        <TabButton active={tab === 'watchlist'} onClick={() => setTab('watchlist')}>
          Watchlist
        </TabButton>
        <TabButton active={tab === 'favorites'} onClick={() => setTab('favorites')}>
          Favorites
        </TabButton>
      </div>
      {active.isPending ? <Spinner /> : null}
      {active.isError ? <ErrorMessage error={active.error} /> : null}
      {active.isSuccess && active.data.length === 0 ? (
        <EmptyState title={tab === 'watchlist' ? 'Watchlist is empty' : 'No favorites yet'}>
          <p>Add titles on themoviedb.org, then return here after the cache refreshes.</p>
        </EmptyState>
      ) : null}
      {active.data && active.data.length > 0 ? <MovieGrid movies={active.data} /> : null}
    </section>
  )
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm ${
        active ? 'bg-amber-300 text-zinc-950' : 'border border-zinc-700 text-zinc-300'
      }`}
    >
      {children}
    </button>
  )
}
