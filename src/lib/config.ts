export function tmdbEnv() {
  return {
    apiKey: import.meta.env.VITE_TMDB_API_KEY?.trim() ?? '',
    token: import.meta.env.VITE_TMDB_ACCESS_TOKEN?.trim() ?? '',
    accountId: import.meta.env.VITE_TMDB_ACCOUNT_ID?.trim() ?? '',
  }
}

export function hasPublicAuth() {
  const { apiKey, token } = tmdbEnv()
  return Boolean(apiKey || token)
}

export function hasAccountAuth() {
  const { accountId, apiKey, token } = tmdbEnv()
  return Boolean(accountId && (apiKey || token))
}
