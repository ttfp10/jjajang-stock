const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

// 📦 DB 생성
const db = new sqlite3.Database("./db.sqlite");

// 🏗️ 테이블 생성 + 기본 데이터
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS stocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      price INTEGER,
      desc TEXT,
      type TEXT,
      leverage INTEGER
    )
  `);

  db.get("SELECT COUNT(*) as count FROM stocks", (err, row) => {
    if (row.count === 0) {
      db.run(`
        INSERT INTO stocks (name, price, desc, type, leverage)
        VALUES ('요미전자', 50000, '테스트 기업', 'normal', 1)
      `);
    }
  });
});

// 📊 종목 조회 API (🔥 핵심)
app.get("/stocks", (req, res) => {
  db.all("SELECT * FROM stocks", (err, rows) => {
    if (err) return res.json([]);
    res.json(rows);
  });
});

// 🔐 로그인 (임시)
app.post("/login", (req, res) => {
  const { id, pw } = req.body;

  if (!id || !pw) {
    return res.json({ error: "로그인 실패" });
  }

  // 🔥 그냥 아무거나 로그인 허용 (테스트용)
  res.json({ token: "test-token" });
});

// 💰 매수
app.post("/buy", (req, res) => {
  const { stockId } = req.body;

  if (!stockId) {
    return res.json({ error: "잘못된 요청" });
  }

  res.json({ success: true });
});

// 🔄 실시간 가격 변동
setInterval(() => {
  db.all("SELECT * FROM stocks", (err, rows) => {
    rows.forEach(s => {
      let change = Math.floor(Math.random() * 1000 - 500);
      let newPrice = Math.max(100, s.price + change);

      db.run("UPDATE stocks SET price=? WHERE id=?", [newPrice, s.id]);

      io.emit("priceUpdate", {
        id: s.id,
        price: newPrice
      });
    });
  });
}, 2000);

// 🚀 서버 실행
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("server running on " + PORT);
});
