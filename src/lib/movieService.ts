const TMDB_API_KEY = '028fa2c04a4b6c4b4dac8b72e4bd4c8a';
const BASE_URL = 'https://api.themoviedb.org/3';

export interface TmdbMovieSearchResult {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
}

export const searchMovies = async (query: string): Promise<TmdbMovieSearchResult[]> => {
  const response = await fetch(
    `${BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
  );
  const data = (await response.json()) as { results?: TmdbMovieSearchResult[] };
  return Array.isArray(data.results) ? data.results : [];
};
