import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { getMovie, posterUrl, youtubeTrailer, yearFromDate } from '../api/tmdb'
import { EmptyState, ErrorMessage, Spinner } from '../components/Status'
import { usePersonalCatalog } from '../hooks/usePersonalCatalog'
import { hasPublicAuth } from '../lib/config'

export function MoviePage() {
  const { id } = useParams()
  const movieId = Number(id)

  const movieQuery = useQuery({
    queryKey: ['movie', movieId],
    queryFn: () => getMovie(movieId),
    enabled: hasPublicAuth() && Number.isFinite(movieId) && movieId > 0,
  })

  const catalogQuery = usePersonalCatalog(hasPublicAuth())

  if (!hasPublicAuth()) {
    return (
      <EmptyState title="TMDB key required">
        <p>Add credentials to .env to load movie details.</p>
      </EmptyState>
    )
  }

  if (!Number.isFinite(movieId)) {
    return <EmptyState title="Invalid movie">That URL is not a movie id.</EmptyState>
  }

  if (movieQuery.isPending) return <Spinner />
  if (movieQuery.isError) return <ErrorMessage error={movieQuery.error} />

  const movie = movieQuery.data
  const yours = catalogQuery.data?.find((entry) => entry.imdbID === movie.imdb_id)
  const poster = posterUrl(movie.poster_path, 'w500')
  const trailer = youtubeTrailer(movie)
  const director = movie.credits?.crew.find((c) => c.job === 'Director')
  const cast = (movie.credits?.cast ?? []).slice(0, 8)
  const year = yearFromDate(movie.release_date)

  return (
    <article className="grid gap-8 md:grid-cols-[240px_1fr]">
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
        {poster ? (
          <img src={poster} alt="" className="w-full" />
        ) : (
          <div className="flex aspect-[2/3] items-center justify-center text-sm text-zinc-500">
            No poster
          </div>
        )}
      </div>
      <div className="space-y-4">
        <p>
          <Link to="/browse" className="text-sm text-zinc-400 hover:text-amber-300">
            ← Browse
          </Link>
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {movie.title}{' '}
          {year ? <span className="text-xl font-normal text-zinc-500">({year})</span> : null}
        </h1>
        {movie.tagline ? <p className="italic text-zinc-400">{movie.tagline}</p> : null}
        <dl className="flex flex-wrap gap-3 text-sm">
          {yours ? (
            <div className="rounded-full bg-amber-300 px-3 py-1 font-medium text-zinc-950">
              Your rating {yours.score}/10
            </div>
          ) : null}
          <div className="rounded-full border border-zinc-700 px-3 py-1 text-zinc-300">
            TMDB {movie.vote_average.toFixed(1)} ({movie.vote_count} votes)
          </div>
          {movie.runtime ? (
            <div className="rounded-full border border-zinc-700 px-3 py-1 text-zinc-300">
              {movie.runtime} min
            </div>
          ) : null}
        </dl>
        <p className="max-w-3xl text-sm leading-7 text-zinc-300">{movie.overview}</p>
        {director ? <p className="text-sm text-zinc-400">Director: {director.name}</p> : null}
        {movie.genres?.length ? (
          <p className="text-sm text-zinc-400">
            {movie.genres.map((g) => g.name).join(' · ')}
          </p>
        ) : null}
        {trailer ? (
          <a
            href={trailer}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full bg-amber-300 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-200"
          >
            Watch trailer
          </a>
        ) : null}
        {cast.length > 0 ? (
          <div>
            <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
              Cast
            </h2>
            <ul className="flex flex-wrap gap-2 text-sm text-zinc-300">
              {cast.map((person) => (
                <li key={person.id} className="rounded-full border border-zinc-800 px-3 py-1">
                  {person.name}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </article>
  )
}
