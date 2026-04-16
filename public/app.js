console.log("앱 실행됨");

document.getElementById("app").innerHTML = `
  <h1>짜장증권 정상 작동</h1>
  <button onclick="test()">테스트 버튼</button>
`;

function test(){
  alert("JS 완벽 작동");
}
