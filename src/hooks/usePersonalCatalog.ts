import { useQuery } from '@tanstack/react-query'
import {
  fetchPersonalCatalog,
  pickTestCatalogMovies,
  PERSONAL_MOVIE_LIMIT,
} from '../api/catalog'

export const personalCatalogQueryKey = ['personal-catalog', PERSONAL_MOVIE_LIMIT, 'title-imdb'] as const

export function usePersonalCatalog(enabled: boolean) {
  return useQuery({
    queryKey: personalCatalogQueryKey,
    queryFn: async () => pickTestCatalogMovies(await fetchPersonalCatalog()),
    enabled,
  })
}
