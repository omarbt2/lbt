import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: '1mb' }));

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Simple in-memory rate limiter for AI endpoints
const rateLimitStore = new Map<string, number[]>();

setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of rateLimitStore.entries()) {
    const fresh = timestamps.filter(t => t > now - 60000);
    if (fresh.length === 0) rateLimitStore.delete(key);
    else rateLimitStore.set(key, fresh);
  }
}, 5 * 60 * 1000);

function rateLimit(windowMs: number, max: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const timestamps = (rateLimitStore.get(ip) || []).filter(t => t > now - windowMs);
    if (timestamps.length >= max) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    timestamps.push(now);
    rateLimitStore.set(ip, timestamps);
    next();
  };
}

const PORT = 3000;

// Lazy initialization of Google GenAI to handle missing API keys gracefully
let aiClient: GoogleGenAI | null = null;
function getAI() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      console.log("GEMINI_API_KEY is not configured or is placeholder. Falling back to simulated AI response.");
      return null;
    }
    try {
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    } catch (e) {
      console.error("Error creating GoogleGenAI client:", e);
      return null;
    }
  }
  return aiClient;
}

// 1. Healthcheck Route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.get("/api/turn-credentials", rateLimit(60000, 30), (_req, res) => {
  res.json({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  });
});

// 2. Real Cloud AI Tag Suggestion Endpoint
app.post("/api/ai/suggest-tags", rateLimit(60000, 10), async (req, res) => {
  const { caption } = req.body;
  
  if (!caption) {
    return res.status(400).json({ error: "Caption is required" });
  }

  const ai = getAI();
  if (!ai) {
    // Graceful fallback to client-side smart categories
    const lower = caption.toLowerCase();
    const suggestions = ["#Inspire"];
    if (lower.includes("design") || lower.includes("art") || lower.includes("architect")) {
      suggestions.push("#Design", "#MinimalStyle");
    }
    if (lower.includes("space") || lower.includes("light") || lower.includes("shadow")) {
      suggestions.push("#Aesthetic", "#FluidCurves");
    }
    if (lower.includes("work") || lower.includes("setup") || lower.includes("tech") || lower.includes("desk")) {
      suggestions.push("#Workspace", "#TechStyle", "#Productivity");
    }
    if (lower.includes("cat") || lower.includes("animal")) {
      suggestions.push("#CatVibes", "#Cutie");
    }
    return res.json({ 
      tags: suggestions, 
      simulated: true,
      message: "Tags generated locally (Configure GEMINI_API_KEY in Secrets for live Cloud AI)." 
    });
  }

  try {
    const prompt = `You are the built-in Cloud AI copilot for LBT Social, a high-fidelity social media app. 
Analyze this post caption and suggest 3 highly creative and trendy hashtags suitable for visual creatives on Instagram/Pinterest. 
Output ONLY a JSON array of strings containing the hashtags (with the symbol #). Do not output markdown, codeblocks, or other text outside the JSON list.
Caption: "${caption}"`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const parsedText = response.text || "[]";
    const cleanedText = parsedText.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    const tags = JSON.parse(cleanedText);
    res.json({ tags, simulated: false });

  } catch (error: any) {
    console.error("Gemini API error during tag suggestion:", error);
    res.json({ 
      tags: ["#Creative", "#LBTStyle"], 
      simulated: true, 
    });
  }
});

// 3. Real Cloud AI Direct Message Interactive Chat Endpoint
app.post("/api/ai/chat", rateLimit(60000, 10), async (req, res) => {
  const { messages, userProfile } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages array is required" });
  }

  const ai = getAI();
  const userName = userProfile?.name || "Elena R.";
  const userBio = userProfile?.bio || "Digital Artist based in NYC";

  if (!ai) {
    // Beautiful, witty simulator response
    const lastUserMessage = messages[messages.length - 1]?.text || "";
    let simulatedReply = `Hey Jessica! I love that! Your creative focus matches my approach at the NYC studio perfectly. Let's definitely collaborate on these glassmorphism screens soon! 🎨✨`;
    
    if (lastUserMessage.toLowerCase().includes("hello") || lastUserMessage.toLowerCase().includes("hey")) {
      simulatedReply = `Hey there! How has yesterday's setup revision been going? I was checking out some new curves in glass panels and would love to hear your feedback!`;
    } else if (lastUserMessage.toLowerCase().includes("design") || lastUserMessage.toLowerCase().includes("code")) {
      simulatedReply = `Oh, designing clean layouts with shadow values is my absolute sweet spot right now! Let's schedule a call to sync.`;
    }

    return res.json({ 
      reply: simulatedReply, 
      simulated: true,
      message: "Response generated locally (Configure GEMINI_API_KEY in Secrets for live Cloud AI)."
    });
  }

  try {
    // Format conversation history for Gemini API
    const formattedHistory = messages.map((m: any) => {
      const role = m.senderId === "me" ? "user" : "model";
      return `${role === "user" ? "User Jessica" : userName}: ${m.text || "[Shared Media]"}`;
    }).join("\n");

    const systemInstruction = `You are "${userName}", a friendly, professional NYC-based digital artist and visual designer with a bio: "${userBio}". 
You are chatting with your creative colleague "Jessica Thompson" inside the DM panel of the LBT Social platform. 
Keep your response short (2-3 sentences max), modern, encouraging, and highly collaborative. Speak directly in character. You love minimalist layouts, translucent waves, glassmorphism, and responsive design structure.`;

    const prompt = `${formattedHistory}\n\nRespond as ${userName} directly inside the chat discussion. Provide only the text message reply in character, concise and helpful:`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.8,
      }
    });

    res.json({ reply: response.text || "", simulated: false });

  } catch (error: any) {
    console.error("Gemini API error during conversation chat:", error);
    res.json({ 
      reply: "Ah, raw network jitter got in our way! Tell me more about your recent render design layout setup?", 
      simulated: true, 
    });
  }
});

// 4. Daily.co Room Creation Endpoint
const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_DOMAIN = process.env.DAILY_DOMAIN || 'getcall';

app.post("/api/daily/create-room", rateLimit(60000, 20), async (req, res) => {
  if (!DAILY_API_KEY) {
    return res.status(500).json({ error: "DAILY_API_KEY not configured on server" });
  }

  const { roomName, exp } = req.body;
  if (!roomName) {
    return res.status(400).json({ error: "roomName is required" });
  }

  try {
    const response = await fetch(`https://api.daily.co/v1/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        name: roomName,
        properties: {
          enable_screensharing: true,
          enable_chat: false,
          exp: exp || Math.floor(Date.now() / 1000) + 3600,
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error || 'Failed to create room' });
    }

    res.json({ url: data.url, name: data.name, id: data.id });
  } catch (error: any) {
    console.error("Daily.co room creation error:", error);
    res.status(500).json({ error: "Failed to create Daily.co room" });
  }
});

app.post("/api/daily/create-meeting-token", rateLimit(60000, 20), async (req, res) => {
  if (!DAILY_API_KEY) {
    return res.status(500).json({ error: "DAILY_API_KEY not configured on server" });
  }

  const { roomName, userId } = req.body;
  if (!roomName || !userId) {
    return res.status(400).json({ error: "roomName and userId are required" });
  }

  try {
    const response = await fetch(`https://api.daily.co/v1/meeting-tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_id: userId,
          is_owner: false,
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error || 'Failed to create token' });
    }

    res.json({ token: data.token });
  } catch (error: any) {
    console.error("Daily.co token creation error:", error);
    res.status(500).json({ error: "Failed to create Daily.co token" });
  }
});

// 5. Vite Dev Server / Static Asset Mounting
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static production build from /dist directory.");
  } else {
    console.log("API server running. Frontend served by Vite on port 5173.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`API server running on http://localhost:${PORT}`);
  });
}

startServer();
