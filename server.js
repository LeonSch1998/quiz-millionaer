const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));
app.get("/vote", (req, res) => res.sendFile(path.join(__dirname, "public", "vote.html")));
app.get("/health", (req, res) => res.json({ ok: true }));

// Online-Fragen serverseitig laden: verhindert CORS-Probleme im Browser.
app.get("/api/questions", async (req, res) => {
  const amount = Math.min(50, Math.max(15, Number.parseInt(req.query.amount, 10) || 50));
  const url = `https://api.opentrivia.de?amount=${amount}&type=multiple`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    let upstream;
    try { upstream = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } }); }
    finally { clearTimeout(timer); }
    if (!upstream.ok) throw new Error(`Trivia-API HTTP ${upstream.status}`);
    const data = await upstream.json();
    if (data.response_code !== 0 || !Array.isArray(data.results)) throw new Error("Ungültige Trivia-API-Antwort");
    res.set("Cache-Control", "no-store").json(data);
  } catch (error) {
    console.error("Trivia-API Fehler:", error.message);
    res.status(502).json({ error: "Online-Fragen derzeit nicht erreichbar" });
  }
});


let currentQuestion = null;
let pollOpen = false;
let votes = { A: 0, B: 0, C: 0, D: 0 };
let voters = new Map();
let audienceSockets = new Set();

function statePayload() {
  return { question: currentQuestion, pollOpen, votes, count: Object.values(votes).reduce((a,b)=>a+b,0) };
}
function broadcastVotes() {
  io.emit("poll:update", { votes, count: Object.values(votes).reduce((a,b)=>a+b,0) });
}
io.on("connection", socket => {
  socket.on("audience:join", () => {
    audienceSockets.add(socket.id);
    socket.emit("audience:state", statePayload());
    io.emit("audience:count", { count: audienceSockets.size });
  });
  socket.on("host:new-game", () => {
    currentQuestion = null; pollOpen = false; votes = { A: 0, B: 0, C: 0, D: 0 }; voters.clear();
    io.emit("poll:ended", { votes, count: 0 });
  });
  socket.on("host:question", data => {
    currentQuestion = data;
    pollOpen = false; votes = { A: 0, B: 0, C: 0, D: 0 }; voters.clear();
    io.emit("host:question", data);
  });
  socket.on("host:start-poll", data => {
    currentQuestion = data; pollOpen = true;
    votes = { A: 0, B: 0, C: 0, D: 0 }; voters.clear();
    io.emit("poll:started", data); broadcastVotes();
  });
  socket.on("host:end-poll", () => {
    pollOpen = false;
    io.emit("poll:ended", { votes, count: Object.values(votes).reduce((a,b)=>a+b,0) });
  });
  socket.on("host:reveal-answer", () => {
    pollOpen = false;
    io.emit("poll:ended", { votes, count: Object.values(votes).reduce((a,b)=>a+b,0) });
  });
  socket.on("audience:vote", data => {
    if (!pollOpen || !currentQuestion || !data || !["A","B","C","D"].includes(data.answer)) return;
    if (data.key !== String(currentQuestion.number) + ":" + currentQuestion.question) return;
    if (voters.has(socket.id)) return;
    voters.set(socket.id, true);
    votes[data.answer] += 1;
    broadcastVotes();
  });
  socket.on("disconnect", () => {
    audienceSockets.delete(socket.id);
    io.emit("audience:count", { count: audienceSockets.size });
  });
});

server.listen(PORT, "0.0.0.0", () => console.log(`Quiz server listening on port ${PORT}`));
