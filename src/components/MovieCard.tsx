import { Link } from 'react-router-dom'
import { posterUrl, yearFromDate, type Movie } from '../api/tmdb'

type Props = {
  movie: Movie & { rating?: number; own?: string }
}

export function MovieCard({ movie }: Props) {
  const poster = posterUrl(movie.poster_path, 'w342')
  const year = yearFromDate(movie.release_date)
  const owned = movie.own === 'y'

  return (
    <Link
      to={`/movie/${movie.id}`}
      className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 transition hover:border-amber-300/50 hover:shadow-lg hover:shadow-amber-300/5"
    >
      <div className="relative aspect-[2/3] bg-zinc-800">
        {poster ? (
          <img
            src={poster}
            alt=""
            className="h-full w-full object-cover transition group-hover:scale-[1.03]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-3 text-center text-xs text-zinc-500">
            No poster
          </div>
        )}
        {owned ? (
          <span
            className="absolute right-2 top-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
            title="Owned"
            aria-label="Owned"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 fill-amber-300"
              aria-hidden="true"
            >
              <path d="M12 2.5 14.94 8.4l6.56.95-4.75 4.63 1.12 6.54L12 17.77 6.13 20.52l1.12-6.54L2.5 9.35l6.56-.95L12 2.5Z" />
            </svg>
          </span>
        ) : null}
      </div>
      <div className="space-y-1 p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-white">{movie.title}</h3>
        <p className="text-xs text-zinc-400">
          {year || '—'}
          {movie.rating != null ? ` · Your ${movie.rating}/10` : ''}
        </p>
      </div>
    </Link>
  )
}

export function MovieGrid({ movies }: { movies: Array<Movie & { rating?: number; own?: string }> }) {
  if (movies.length === 0) {
    return <p className="text-sm text-zinc-400">No movies to show.</p>
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {movies.map((movie) => (
        <li key={movie.id}>
          <MovieCard movie={movie} />
        </li>
      ))}
    </ul>
  )
}
