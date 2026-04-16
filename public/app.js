console.log("짜장증권 실행");

const socket = io();

let token = null;
let stocks = [];

// 🔄 실시간 가격 업데이트
socket.on("priceUpdate", (d) => {
  let s = stocks.find(x => x.id === d.id);
  if (s) {
    s.price = d.price;
    render();
  }
});

// 🔐 로그인
async function login() {
  let id = prompt("ID");
  let pw = prompt("PW");

  try {
    let res = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ id, pw })
    });

    let data = await res.json();

    if (!data.token) {
      alert("로그인 실패");
      return;
    }

    token = data.token;
    alert("로그인 성공");

  } catch (e) {
    alert("서버 오류");
  }
}

// 📦 종목 불러오기
async function loadStocks() {
  try {
    let res = await fetch("/stocks");
    stocks = await res.json();
    render();
  } catch (e) {
    console.log(e);
  }
}

// 🖥️ UI 렌더
function render() {
  let html = `
    <h2>짜장증권</h2>
    <button onclick="login()">로그인</button>
    <hr>
  `;

  if (stocks.length === 0) {
    html += `<p>종목 없음</p>`;
  }

  stocks.forEach(s => {
    html += `
      <div style="padding:10px;border-bottom:1px solid #333;">
        <b>${s.name}</b><br>
        가격: ${s.price}<br>
        <button onclick="buy(${s.id})">매수</button>
      </div>
    `;
  });

  document.getElementById("app").innerHTML = html;
}

// 💰 매수
async function buy(id) {
  if (!token) {
    alert("로그인 먼저");
    return;
  }

  try {
    await fetch("/buy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token
      },
      body: JSON.stringify({ stockId: id })
    });

    alert("매수 완료");
  } catch (e) {
    console.log(e);
  }
}

// ▶ 실행
loadStocks();
