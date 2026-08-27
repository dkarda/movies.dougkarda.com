import { Link } from 'react-router-dom'
import { posterUrl, yearFromDate, type Movie } from '../api/tmdb'

type Props = {
  movie: Movie & { rating?: number }
}

export function MovieCard({ movie }: Props) {
  const poster = posterUrl(movie.poster_path, 'w342')
  const year = yearFromDate(movie.release_date)

  return (
    <Link
      to={`/movie/${movie.id}`}
      className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 transition hover:border-amber-300/50 hover:shadow-lg hover:shadow-amber-300/5"
    >
      <div className="aspect-[2/3] bg-zinc-800">
        {poster ? (
          <img
            src={poster}
            alt=""
            className="h-full w-full object-cover transition group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-3 text-center text-xs text-zinc-500">
            No poster
          </div>
        )}
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

export function MovieGrid({ movies }: { movies: Array<Movie & { rating?: number }> }) {
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
