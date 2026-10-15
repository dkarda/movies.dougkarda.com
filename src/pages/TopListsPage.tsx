import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  catalogFilterOptions,
  listRankFor,
  toplistBySlug,
  toplistSlug,
  type PersonalMovie,
} from '../api/catalog'
import { FilterSelect } from '../components/FilterSelect'
import { LazyMovieGrid } from '../components/LazyMovieGrid'
import { EmptyState, ErrorMessage, Spinner } from '../components/Status'
import { usePersonalCatalog } from '../hooks/usePersonalCatalog'
import { hasPublicAuth } from '../lib/config'

const EMPTY_MOVIES: PersonalMovie[] = []

function moviesForList(movies: PersonalMovie[], listName: string) {
  return movies
    .filter((movie) => (movie.toplists ?? []).some((item) => item.listName === listName))
    .sort(
      (a, b) =>
        (listRankFor(b, listName) ?? -Infinity) - (listRankFor(a, listName) ?? -Infinity) ||
        (a.Title ?? '').localeCompare(b.Title ?? ''),
    )
}

export function TopListsPage() {
  const enabled = hasPublicAuth()
  const catalogQuery = usePersonalCatalog(enabled)
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const movies = catalogQuery.data ?? EMPTY_MOVIES
  const lists = useMemo(() => catalogFilterOptions(movies).toplists, [movies])
  const selected = slug ? toplistBySlug(lists, slug) : undefined
  const visibleLists = slug ? (selected ? [selected] : []) : lists

  if (!enabled) {
    return (
      <EmptyState title="Add your TMDB credentials">
        <p>Top lists need TMDB credentials to load posters.</p>
      </EmptyState>
    )
  }

  if (catalogQuery.isPending) return <Spinner />
  if (catalogQuery.isError) return <ErrorMessage error={catalogQuery.error} />

  return (
    <section className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {selected ? `Top ${selected.count} ${selected.name}` : 'Top lists'}
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Hand-picked ranked lists from the catalog. Rank on each poster is that list's
          order.
        </p>
      </div>

      {lists.length > 0 ? (
        <form
          className="max-w-xs rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4"
          onSubmit={(event) => event.preventDefault()}
        >
          <FilterSelect
            label="List"
            value={selected ? toplistSlug(selected.name) : ''}
            onChange={(next) => navigate(next ? `/lists/${next}` : '/lists')}
            options={lists.map((list) => ({
              value: toplistSlug(list.name),
              label: `Top ${list.count} ${list.name}`,
            }))}
          />
        </form>
      ) : null}

      {lists.length === 0 ? (
        <EmptyState title="No top lists yet">
          <p>Nothing in the catalog is assigned to a top list.</p>
        </EmptyState>
      ) : null}

      {slug && !selected && lists.length > 0 ? (
        <EmptyState title="List not found">
          <p>That URL does not match a catalog top list. Pick one from the menu.</p>
        </EmptyState>
      ) : null}

      {visibleLists.map((list) => {
        const entries = moviesForList(movies, list.name)
        return (
          <div key={list.name} className="space-y-4">
            {selected ? null : (
              <h2 className="text-xl font-medium text-amber-200">
                Top {list.count} {list.name}
              </h2>
            )}
            {entries.length > 0 ? (
              <LazyMovieGrid entries={entries} listName={list.name} rootMargin="120px" />
            ) : (
              <p className="text-sm text-zinc-400">No titles on this list.</p>
            )}
          </div>
        )
      })}
    </section>
  )
}
