import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { BrowsePage } from './pages/BrowsePage'
import { HomePage } from './pages/HomePage'
import { MoviePage } from './pages/MoviePage'
import { RankingsPage } from './pages/RankingsPage'
import { StatsPage } from './pages/StatsPage'
import { WatchlistPage } from './pages/WatchlistPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="browse" element={<BrowsePage />} />
          <Route path="rankings" element={<RankingsPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="watchlist" element={<WatchlistPage />} />
          <Route path="movie/:id" element={<MoviePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
