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
