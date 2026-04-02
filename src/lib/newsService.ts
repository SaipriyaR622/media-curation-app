
export const fetchNews = async () => {
  try {
    const res = await fetch(
      `https://newsdata.io/api/1/news?apikey=${import.meta.env.VITE_NEWSDATA_API_KEY}&language=en&country=in`
    );

    const data = await res.json();
    console.log("NEWSDATA:", data);

    return data.results || [];
  } catch (err) {
    console.error("NewsData error:", err);
    return [];
  }
};

