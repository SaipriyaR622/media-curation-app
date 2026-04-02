
import { useEffect, useState, useRef } from "react";
import { fetchNews } from "@/lib/newsService";
import { Navbar } from "@/components/Navbar";

const News = () => {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState<any | null>(null);

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // 📰 FETCH NEWS
  useEffect(() => {
    const loadNews = async () => {
      try {
        const data = await fetchNews();
        console.log("NEWSDATA:", data);
        setNews(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("News error:", err);
        setNews([]);
      } finally {
        setLoading(false);
      }
    };

    loadNews();
  }, []);

  // 🔽 AUTO SCROLL CHAT
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🤖 AI CALL (FIXED CONTEXT)
  const askAI = async (message: string) => {
    if (loadingAI) return;

    try {
      setLoadingAI(true);

      const context = `
Title: ${selectedNews?.title || ""}

Description: ${selectedNews?.description || ""}

Content: ${selectedNews?.content || ""}

Source: ${selectedNews?.source_id || ""}
`;

      const res = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          context,
        }),
      });

      const data = await res.json();
      console.log("AI RESPONSE:", data);

      let reply = data?.reply?.trim();

      if (!reply || reply.length < 5) {
        reply = "⚠️ AI couldn't generate a proper response.";
      }

      setMessages((prev) => [...prev, { role: "ai", text: reply }]);
    } catch (err) {
      console.error("AI error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "⚠️ Error talking to AI." },
      ]);
    } finally {
      setLoadingAI(false);
    }
  };

  // 📰 SELECT NEWS
  const handleSelectNews = (item: any) => {
    if (loadingAI) return;

    setSelectedNews(item);
    setMessages([]);

    // 🔥 NO AUTO CALL (saves API)
    // user will trigger AI manually
  };

  // 💬 SEND MESSAGE
  const handleSend = async () => {
    if (!input.trim() || loadingAI) return;

    const userMessage = input;

    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setInput("");

    await askAI(userMessage);
  };

  // 🔥 SUMMARIZE BUTTON
  const handleSummarize = async () => {
    if (loadingAI) return;

    setMessages([]);
    await askAI("Summarize this news clearly.");
  };

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />

      <div className="px-8 py-6">
        <h1 className="text-3xl mb-6">Latest News</h1>

        {loading ? (
          <p>Loading...</p>
        ) : news.length === 0 ? (
          <p>No news found</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">

            {/* 🌟 FEATURED */}
            <div
              onClick={() => handleSelectNews(news[0])}
              className="md:col-span-2 md:row-span-2 bg-neutral-900 rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] transition"
            >
              <img
                src={news[0]?.image_url || "https://via.placeholder.com/800"}
                className="w-full h-[300px] object-cover"
              />
              <div className="p-5">
                <h2 className="text-2xl font-semibold">
                  {news[0]?.title || "No title"}
                </h2>
              </div>
            </div>

            {/* 📰 GRID */}
            {news.slice(1, 9).map((item, i) => (
              <div
                key={i}
                onClick={() => handleSelectNews(item)}
                className="bg-neutral-800 rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] transition"
              >
                <img
                  src={item?.image_url || "https://via.placeholder.com/400"}
                  className="w-full h-[180px] object-cover"
                />
                <div className="p-3">
                  <p className="text-sm font-medium">
                    {item?.title || "No title"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🤖 AI PANEL */}
      {selectedNews && (
        <div className="fixed top-0 right-0 h-full w-[400px] bg-black flex flex-col z-50 shadow-xl">

          {/* HEADER */}
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <h2 className="text-sm font-semibold">AI Assistant</h2>
            <button onClick={() => setSelectedNews(null)}>✕</button>
          </div>

          {/* TITLE */}
          <div className="p-4 border-b border-gray-800 text-sm text-gray-300">
            {selectedNews.title}
          </div>

          {/* 🔥 SUMMARIZE BUTTON */}
          <div className="p-3 border-b border-gray-800">
            <button
              onClick={handleSummarize}
              className="w-full bg-blue-600 py-2 rounded text-sm"
            >
              Summarize
            </button>
          </div>

          {/* CHAT */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg text-sm ${
                  msg.role === "user"
                    ? "bg-blue-600"
                    : "bg-gray-700"
                }`}
              >
                {msg.text}
              </div>
            ))}

            {loadingAI && (
              <div className="text-gray-400 text-sm animate-pulse">
                AI is thinking...
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* INPUT */}
          <div className="p-3 border-t border-gray-700 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this news..."
              className="flex-1 bg-gray-800 p-2 rounded text-sm outline-none"
            />
            <button
              onClick={handleSend}
              className="bg-white text-black px-3 py-2 rounded text-sm"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default News;
