
(() => {
  "use strict";
  function init(){
    const login=document.getElementById("login-screen");
    const dash=document.getElementById("dashboard-screen");
    const mascot=document.getElementById("csv-mascot");
    const stage=document.querySelector(".csv-mascot-stage");
    const email=document.getElementById("email");
    const senha=document.getElementById("senha");
    const btn=document.getElementById("btn-login");
    const form=document.getElementById("form-login");
    const toggle=document.getElementById("toggle-password");
    const status=document.getElementById("csv-login-status");
    if(!login||!mascot)return;
    const visivel=()=>getComputedStyle(login).display!=="none";
    const estado=(nome="")=>{
      mascot.classList.remove("is-password","is-waiting","is-error","is-happy");
      if(nome)mascot.classList.add(nome);
    };
    const conexao=()=>{
      if(!status)return;
      if(navigator.onLine){
        status.className="csv-login-status is-online";
        status.innerHTML='<i class="ri-wifi-line"></i> Sistema conectado e pronto para sincronizar';
      }else{
        status.className="csv-login-status is-offline";
        status.innerHTML='<i class="ri-wifi-off-line"></i> Sem conexão — última versão salva disponível';
      }
    };
    conexao();
    addEventListener("online",conexao);addEventListener("offline",conexao);
    stage?.addEventListener("pointermove",e=>{
      if(mascot.classList.contains("is-password"))return;
      const r=stage.getBoundingClientRect();
      const x=Math.max(-6,Math.min(6,(e.clientX-r.left-r.width/2)/30));
      const y=Math.max(-4,Math.min(5,(e.clientY-r.top-r.height/2)/38));
      mascot.style.setProperty("--look-x",`${x}px`);
      mascot.style.setProperty("--look-y",`${y}px`);
    });
    stage?.addEventListener("pointerleave",()=>{
      mascot.style.setProperty("--look-x","0px");mascot.style.setProperty("--look-y","0px");
    });
    email?.addEventListener("focus",()=>estado(""));
    senha?.addEventListener("focus",()=>estado(senha.type==="password"?"is-password":""));
    toggle?.addEventListener("click",()=>{
      senha.type=senha.type==="password"?"text":"password";
      toggle.innerHTML=senha.type==="password"?'<i class="ri-eye-line"></i>':'<i class="ri-eye-off-line"></i>';
      estado(senha.type==="password"?"is-password":"");senha.focus();
    });
    const tentando=()=>{
      if(!email?.value.trim()||!senha?.value.trim())return;
      estado("is-waiting");
      if(status){status.className="csv-login-status";status.innerHTML='<i class="ri-loader-4-line ri-spin"></i> Validando acesso...';}
    };
    btn?.addEventListener("click",tentando,true);
    form?.addEventListener("submit",tentando,true);
    if(btn)new MutationObserver(()=>{
      if(!btn.disabled&&visivel()&&mascot.classList.contains("is-waiting")){
        estado("is-error");
        if(status){status.className="csv-login-status is-error";status.innerHTML='<i class="ri-error-warning-line"></i> Confira o e-mail e a senha';}
        setTimeout(()=>{if(visivel()){estado("");conexao();}},2000);
      }
    }).observe(btn,{attributes:true,attributeFilter:["disabled"]});
    new MutationObserver(()=>{
      if(!visivel()){
        estado("is-happy");document.body.classList.add("csv-auth-success");
        dash?.classList.add("csv-dashboard-enter");
        setTimeout(()=>document.body.classList.remove("csv-auth-success"),1250);
      }else{estado("");conexao();}
    }).observe(login,{attributes:true,attributeFilter:["style","class"]});
  }
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init):init();
})();
