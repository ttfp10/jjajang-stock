const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const sqlite3 = require("sqlite3").verbose();
const jwt = require("jsonwebtoken");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

const SECRET = "jjajang";
const db = new sqlite3.Database("stock.db");

// ===== DB 초기화 =====
db.serialize(()=>{
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    pw TEXT,
    money INTEGER,
    isAdmin INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    price INTEGER,
    desc TEXT,
    type TEXT,
    leverage INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS holdings (
    userId TEXT,
    stockId INTEGER,
    qty INTEGER,
    PRIMARY KEY(userId, stockId)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    stockId INTEGER,
    targetPrice INTEGER,
    type TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS futures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    stockId INTEGER,
    predict TEXT,
    endTime INTEGER,
    amount INTEGER,
    leverage INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    stockId INTEGER,
    type TEXT,
    price INTEGER,
    qty INTEGER,
    time TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS price_history (
    stockId INTEGER,
    price INTEGER,
    time TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT,
    stockId INTEGER,
    impact INTEGER,
    time TEXT
  )`);

  db.run(`INSERT OR IGNORE INTO users VALUES ('admin','1234',9999999,1)`);
});

// ===== JWT =====
function auth(req,res,next){
  const token = req.headers.authorization;
  if(!token) return res.sendStatus(401);
  try{
    req.user = jwt.verify(token, SECRET);
    next();
  }catch{
    res.sendStatus(403);
  }
}

// ===== 회원 =====
app.post("/register",(req,res)=>{
  const {id,pw} = req.body;
  db.run("INSERT INTO users VALUES (?,?,1000000,0)",[id,pw]);
  res.send("ok");
});

app.post("/login",(req,res)=>{
  const {id,pw} = req.body;
  db.get("SELECT * FROM users WHERE id=? AND pw=?",[id,pw],(e,u)=>{
    if(!u) return res.send(null);
    const token = jwt.sign({id:u.id}, SECRET);
    res.send({token});
  });
});

// ===== 종목 =====
app.get("/stocks",(req,res)=>{
  db.all("SELECT * FROM stocks",(e,r)=>res.send(r));
});

// ===== 매수 =====
app.post("/buy", auth, (req,res)=>{
  const {stockId} = req.body;

  db.get("SELECT * FROM stocks WHERE id=?", [stockId], (e,s)=>{
    db.run("UPDATE users SET money=money-? WHERE id=?",
      [s.price, req.user.id]);

    db.run(`INSERT INTO holdings VALUES (?,?,1)
      ON CONFLICT(userId,stockId) DO UPDATE SET qty=qty+1`,
      [req.user.id, stockId]);

    db.run(`INSERT INTO transactions VALUES
      (NULL,?,?,?,?,datetime('now'))`,
      [req.user.id, stockId, "buy", s.price, 1]);

    io.emit("trade",{type:"buy",stockId,price:s.price});

    res.send("ok");
  });
});

// ===== 예약주문 =====
app.post("/order", auth, (req,res)=>{
  const {stockId, targetPrice, type} = req.body;

  db.run(`INSERT INTO orders VALUES (NULL,?,?,?,?)`,
    [req.user.id, stockId, targetPrice, type]);

  res.send("ok");
});

// ===== 선물 =====
app.post("/future", auth, (req,res)=>{
  const {stockId, predict, seconds, amount, leverage} = req.body;

  let endTime = Date.now() + seconds*1000;

  db.run(`INSERT INTO futures VALUES
    (NULL,?,?,?,?,?,?)`,
    [req.user.id, stockId, predict, endTime, amount, leverage]);

  res.send("ok");
});

// ===== 뉴스 =====
app.post("/admin/news", (req,res)=>{
  const {title,content,stockId,impact} = req.body;

  db.run(`INSERT INTO news VALUES
    (NULL,?,?,?,?,datetime('now'))`,
    [title,content,stockId,impact]);

  res.send("ok");
});

app.get("/news/:id",(req,res)=>{
  db.all("SELECT * FROM news WHERE stockId=? ORDER BY time DESC",
    [req.params.id],(e,r)=>res.send(r));
});

// ===== 차트 =====
app.get("/chart/:id",(req,res)=>{
  db.all(`SELECT * FROM price_history WHERE stockId=? ORDER BY time DESC LIMIT 50`,
    [req.params.id],(e,r)=>res.send(r.reverse()));
});

// ===== 가격 시스템 =====
setInterval(()=>{
  db.all("SELECT * FROM stocks",(e,stocks)=>{
    stocks.forEach(s=>{
      let random = Math.random()*2000 - 1000;

      db.all(`SELECT impact FROM news
        WHERE stockId=? AND time >= datetime('now','-1 minute')`,
        [s.id],(e,news)=>{

          let impactSum = 0;
          news.forEach(n=>{
            impactSum += n.impact * (500 + Math.random()*1000);
          });

          let newPrice = Math.max(1000, s.price + random + impactSum);

          db.run("UPDATE stocks SET price=? WHERE id=?",
            [newPrice, s.id]);

          db.run("INSERT INTO price_history VALUES (?,?,datetime('now'))",
            [s.id, newPrice]);

          io.emit("priceUpdate",{id:s.id,price:newPrice});
      });
    });
  });
},2000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>console.log("server running"));
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    price INTEGER,
    desc TEXT,
    type TEXT,
    leverage INTEGER
  )`);

  db.get("SELECT COUNT(*) as count FROM stocks", (err, row) => {
    if (row.count === 0) {
      db.run(`
        INSERT INTO stocks (name, price, desc, type, leverage)
        VALUES ('짜장전자', 50000, '테스트 기업', 'normal', 1)
      `);
    }
  });
});
