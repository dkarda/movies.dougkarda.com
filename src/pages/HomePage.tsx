import { useMemo, useState } from 'react'
import {
  catalogFilterOptions,
  EMPTY_CATALOG_FILTERS,
  filterCatalog,
  type CatalogFilters,
} from '../api/catalog'
import { LazyMovieGrid } from '../components/LazyMovieGrid'
import { EmptyState, ErrorMessage, Spinner } from '../components/Status'
import { usePersonalCatalog } from '../hooks/usePersonalCatalog'
import { hasPublicAuth } from '../lib/config'

const selectClass =
  'rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white'

export function HomePage() {
  const enabled = hasPublicAuth()
  const catalogQuery = usePersonalCatalog(enabled)
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_CATALOG_FILTERS)

  const movies = catalogQuery.data ?? []
  const options = useMemo(() => catalogFilterOptions(movies), [movies])
  const visible = useMemo(() => filterCatalog(movies, filters), [movies, filters])
  const filtersActive = JSON.stringify(filters) !== JSON.stringify(EMPTY_CATALOG_FILTERS)

  if (!enabled) {
    return (
      <EmptyState title="Add your TMDB credentials">
        <p>
          Copy <code className="rounded bg-zinc-800 px-1">.env.example</code> to{' '}
          <code className="rounded bg-zinc-800 px-1">.env</code> and set{' '}
          <code className="rounded bg-zinc-800 px-1">VITE_TMDB_API_KEY</code> or{' '}
          <code className="rounded bg-zinc-800 px-1">VITE_TMDB_ACCESS_TOKEN</code>. Restart
          the dev server after saving.
        </p>
      </EmptyState>
    )
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">TheDoug ratings</h1>
      </div>

      {catalogQuery.isSuccess ? (
        <form
          className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(event) => event.preventDefault()}
        >
          <label className="flex flex-col gap-1 text-xs text-zinc-400 sm:col-span-2">
            Search
            <input
              value={filters.query}
              onChange={(event) =>
                setFilters((current) => ({ ...current, query: event.target.value }))
              }
              className={selectClass}
              placeholder="Title, director, or actor"
            />
          </label>
          <FilterSelect
            label="Genre"
            value={filters.genre}
            onChange={(genre) => setFilters((current) => ({ ...current, genre }))}
            options={options.genres.map((value) => ({ value, label: value }))}
          />
          <FilterSelect
            label="Year"
            value={filters.year}
            onChange={(year) => setFilters((current) => ({ ...current, year }))}
            options={options.years.map((value) => ({ value, label: value }))}
            emptyLabel="Any"
          />
          <FilterSelect
            label="Collection"
            value={filters.collection}
            onChange={(collection) => setFilters((current) => ({ ...current, collection }))}
            options={options.collections.map((value) => ({ value, label: value }))}
          />
          <FilterSelect
            label="Top list"
            value={filters.toplist}
            onChange={(toplist) => setFilters((current) => ({ ...current, toplist }))}
            options={options.toplists.map((value) => ({ value, label: value }))}
          />
          <FilterSelect
            label="Owned"
            value={filters.own}
            onChange={(own) => setFilters((current) => ({ ...current, own }))}
            options={options.owns.map((value) => ({
              value,
              label: value === 'y' ? 'Yes' : value === 'n' ? 'No' : value,
            }))}
            emptyLabel="Any"
          />
          <label className="flex flex-col gap-1 text-xs text-zinc-400">
            Sort
            <select
              value={filters.sort}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  sort: event.target.value as CatalogFilters['sort'],
                }))
              }
              className={selectClass}
            >
              <option value="title">Title A-Z</option>
              <option value="score-desc">Score high-low</option>
              <option value="score-asc">Score low-high</option>
              <option value="year-desc">Year newest</option>
              <option value="year-asc">Year oldest</option>
            </select>
          </label>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
            <button
              type="button"
              className="rounded-full border border-zinc-600 px-4 py-2 text-sm disabled:opacity-40"
              disabled={!filtersActive}
              onClick={() => setFilters(EMPTY_CATALOG_FILTERS)}
            >
              Clear filters
            </button>
            <p className="text-sm text-zinc-400">
              Showing {visible.length} of {movies.length}
            </p>
          </div>
        </form>
      ) : null}

      {catalogQuery.isPending ? <Spinner /> : null}
      {catalogQuery.isError ? <ErrorMessage error={catalogQuery.error} /> : null}
      {catalogQuery.isSuccess && movies.length === 0 ? (
        <EmptyState title="No ratings yet">
          <p>Could not find scored titles with IMDb IDs in the catalog.</p>
        </EmptyState>
      ) : null}
      {catalogQuery.isSuccess && movies.length > 0 && visible.length === 0 ? (
        <EmptyState title="No matches">
          <p>Nothing in this batch fits those filters. Clear them or pick another value.</p>
        </EmptyState>
      ) : null}
      {visible.length > 0 ? (
        <LazyMovieGrid key={listSignature(visible, filters)} entries={visible} />
      ) : null}
    </section>
  )
}

function listSignature(movies: { imdbID?: string }[], filters: CatalogFilters) {
  return `${filters.sort}:${movies.length}:${movies[0]?.imdbID ?? ''}:${movies.at(-1)?.imdbID ?? ''}`
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  emptyLabel = 'All',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  emptyLabel?: string
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-zinc-400">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={selectClass}
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
