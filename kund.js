const {createClient}=supabase;
const sb=createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false}});
const app=document.getElementById("app");
let state={plate:"",minutes:60,spot:null,parking:null,timer:null};
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
function shell(x){app.innerHTML='<section class="panel">'+x+'</section>'}
async function spots(){let {data,error}=await sb.from("parking_spots").select("*").eq("active",true).order("position");
if(error){shell("<h2>Databasfel</h2><p>"+esc(error.message)+"</p>");return[]}return data||[]}
function start(){shell(`<div class="step">STEG 1</div><h1>Parkera</h1><p>Skriv in registreringsnumret och välj hur länge du vill stå.</p>
<div class="form"><label>Registreringsnummer<input id="plate" maxlength="12" placeholder="ABC 123"></label>
<label>Parkeringstid<select id="mins"><option value="30">30 minuter</option><option value="60" selected>1 timme</option>
<option value="120">2 timmar</option><option value="180">3 timmar</option><option value="360">6 timmar</option><option value="720">12 timmar</option></select></label>
<button class="btn" onclick="choose()">Nästa →</button></div>`)}
async function choose(){state.plate=document.getElementById("plate").value.trim().toUpperCase();state.minutes=Number(document.getElementById("mins").value);
if(!state.plate)return alert("Skriv in registreringsnumret.");
let ss=await spots();let occupied=new Set();let {data:ps}=await sb.from("parking_sessions").select("spot_id").in("status",["active","expired"]);
(ps||[]).forEach(x=>occupied.add(x.spot_id));let free=ss.filter(x=>x.type==="parking"&&!occupied.has(x.id));
if(!free.length)return shell("<h1>Fullt</h1><p>Det finns inga lediga platser just nu.</p>");
state.spot=free[Math.floor(Math.random()*free.length)];
shell(`<div class="step">STEG 2</div><h1>Din plats</h1><p>Parkera på den <b>markerade gröna</b> platsen.</p>
<div class="grid" id="map"></div><div class="notice">Din tilldelade plats: <b>${esc(state.spot.label)}</b></div>
<button class="btn green" onclick="begin()">Jag har parkerat – starta parkering</button>`);renderMap(ss)}
function renderMap(ss){const map=document.getElementById("map");if(!map)return;
map.innerHTML=ss.map(x=>`<button class="spot ${x.id===state.spot?.id?"selected free":x.type==="blocked"?"blocked":"free"}" disabled>${esc(x.label)}</button>`).join("")}
async function begin(){let end=new Date(Date.now()+state.minutes*60000).toISOString();
let {data,error}=await sb.from("parking_sessions").insert({plate:state.plate,spot_id:state.spot.id,started_at:new Date().toISOString(),ends_at:end,status:"active"}).select().single();
if(error)return alert(error.message);state.parking=data;localStorage.setItem("parking_id",data.id);run()}
async function loadParking(){let id=localStorage.getItem("parking_id");if(!id)return false;
let {data}=await sb.from("parking_sessions").select("*,parking_spots(label)").eq("id",id).single();if(!data)return false;state.parking=data;return true}
function run(){renderRun();clearInterval(state.timer);state.timer=setInterval(renderRun,1000)}
async function renderRun(){if(!state.parking&&!await loadParking()){start();return}
let end=new Date(state.parking.ends_at).getTime(),left=end-Date.now(),expired=left<=0;
if(expired&&state.parking.status==="active"){await sb.from("parking_sessions").update({status:"expired"}).eq("id",state.parking.id);state.parking.status="expired"}
let m=Math.max(0,Math.floor(left/60000)),s=Math.max(0,Math.floor(left/1000)%60);
shell(`<div class="step">PÅGÅR</div><h1>${esc(state.parking.plate)}</h1><p>Plats: <b>${esc(state.parking.parking_spots?.label||"")}</b></p>
<div class="timer">${m}:${String(s).padStart(2,"0")}</div>
${expired?'<div class="notice danger"><b>Tiden har gått ut.</b><br>Flytta bilen eller avsluta parkeringen.</div>':'<div class="notice success">Parkeringen är aktiv.</div>'}
<button class="btn red" onclick="exitPark()">🚗 Kör ut</button>`)}
async function exitPark(){clearInterval(state.timer);let id=state.parking.id;
let {error}=await sb.from("parking_sessions").update({status:"completed",exited_at:new Date().toISOString()}).eq("id",id);
if(error)return alert(error.message);localStorage.removeItem("parking_id");
shell('<h1>Ha en bra dag! 👋</h1><p>Parkeringen är avslutad.</p><a class="btn" href="kund.html">Ny parkering</a>')}
if(localStorage.getItem("parking_id"))renderRun();else start();