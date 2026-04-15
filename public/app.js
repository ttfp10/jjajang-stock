const socket = io();
let token=null;
let stocks=[];

socket.on("priceUpdate",(d)=>{
  let s = stocks.find(x=>x.id===d.id);
  if(s) s.price=d.price;
  render();
});

async function login(){
  let id=prompt("ID");
  let pw=prompt("PW");

  let res=await fetch("/login",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({id,pw})
  });

  let data=await res.json();
  token=data.token;
  loadStocks();
}

async function loadStocks(){
  let res=await fetch("/stocks");
  stocks=await res.json();
  render();
}

function tab(t){
  render();
}

function render(){
  let html=`<h2>짜장증권</h2>
  <button onclick="login()">로그인</button>`;

  stocks.forEach(s=>{
    html+=`
    <div>
      ${s.name} ${s.price}
      <button onclick="buy(${s.id})">매수</button>
    </div>`;
  });

  document.getElementById("app").innerHTML=html;
}

async function buy(id){
  await fetch("/buy",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":token
    },
    body:JSON.stringify({stockId:id})
  });
}

render();
