
const express = require("express");
const cors = require("cors");
require("dotenv").config({ path: "./.env" });

const { GoogleGenerativeAI } = require("@google/generative-ai");
const Parser = require("rss-parser");

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const parser = new Parser();


// ✅ ROOT TEST
app.get("/", (req, res) => {
  res.send("Gemini server running 🚀");
});


// 🤖 AI CHAT + SUMMARY + GENERAL MODE
app.post("/chat", async (req, res) => {
  try {
    let { message, context } = req.body;

    console.log("CHAT INPUT:", { message, context });

    // ✅ SAFETY
    const safeMessage =
      message && message.trim().length > 0
        ? message
        : "Summarize this news.";

    const safeContext =
      context && context.trim().length > 20
        ? context
        : "";

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", // safer quota
    });

    // 🔥 INTENT DETECTION
    const msg = safeMessage.toLowerCase();

    const isSummary = msg.includes("summar");
    const isGeneral =
      safeContext === "" || // no article
      (!msg.includes("this") &&
        !msg.includes("article") &&
        msg.length < 50);

    let prompt;

    // 📰 SUMMARY MODE
    if (isSummary && safeContext) {
      prompt = `
Summarize the following news article in 3-4 lines:

${safeContext}
`;
    }

    // 🤖 GENERAL AI MODE
    else if (isGeneral) {
      prompt = `
You are a helpful AI assistant.

Answer the user's question clearly and simply:

${safeMessage}
`;
    }

    // 📰 ARTICLE Q&A MODE
    else {
      prompt = `
You are an AI assistant helping with a news article.

Article:
${safeContext}

User Question:
${safeMessage}

IMPORTANT:
- Answer the question directly
- Do NOT summarize unless asked
- Keep answer short and relevant
`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // ✅ EMPTY RESPONSE FIX
    if (!text || text.trim().length < 5) {
      text = "⚠️ AI couldn't generate a proper response. Try again.";
    }

    res.json({ reply: text });
  } catch (error) {
    console.error("Gemini Error:", error);

    if (error.status === 429) {
      return res.json({
        reply: "⚠️ AI limit reached. Try again later.",
      });
    }

    res.json({
      reply: "⚠️ AI temporarily unavailable.",
    });
  }
});


// 📰 NEWS (RSS)
app.get("/news", async (req, res) => {
  try {
    const feed = await parser.parseURL(
      "https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en"
    );

    console.log("RSS ITEMS COUNT:", feed.items.length);

    const articles = feed.items.slice(0, 10).map((item) => ({
      title: item.title || "No title",
      description:
        item.contentSnippet ||
        item.content ||
        "No description available",
      url: item.link,
      image:
        item.enclosure?.url ||
        "https://via.placeholder.com/400x200?text=News",
    }));

    res.json({ articles });
  } catch (err) {
    console.error("RSS ERROR:", err);

    res.json({
      articles: [
        {
          title: "Unable to load live news",
          description: "Please try again later.",
          url: "#",
          image: "https://via.placeholder.com/400x200?text=Error",
        },
      ],
    });
  }
});


// 🧪 TEST
app.get("/test-ai", async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const result = await model.generateContent("Say hello in one sentence");
    const response = await result.response;

    res.send(response.text());
  } catch (err) {
    console.error(err);
    res.send("AI error");
  }
});


// 🚀 START
app.listen(5000, () => {
  console.log("🚀 Gemini server running on http://localhost:5000");
});

