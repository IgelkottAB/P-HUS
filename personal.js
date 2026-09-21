const {createClient}=supabase;
const sb=createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY);
const app=document.getElementById("app");let spots=[],sessions=[];
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
function panel(x){app.innerHTML='<section class="panel">'+x+'</section>'}
async function load(){let a=await sb.from("parking_spots").select("*").order("position");
if(a.error)return panel("<h2>Databasfel</h2><p>"+esc(a.error.message)+"</p>");spots=a.data||[];
let b=await sb.from("parking_sessions").select("*,parking_spots(label)").in("status",["active","expired"]).order("ends_at");
sessions=b.data||[];render()}
function statusFor(id){let s=sessions.find(x=>x.spot_id===id);if(!s)return "free";
if(s.status==="expired"||new Date(s.ends_at)<new Date())return "expired";return "busy"}
function render(){panel(`<div class="actions"><div><div class="step">PERSONAL</div><h1>P-husets kontroll</h1>
<p>Här ser du platser, bilar och tider.</p></div><button class="btn secondary" onclick="editMap()">⚙ Bygg karta</button></div>
<div class="legend"><span><i class="dot" style="background:#55c98a"></i> Ledig</span><span><i class="dot" style="background:#e7c84b"></i> Upptagen</span>
<span><i class="dot" style="background:#e35d5d"></i> Tiden slut</span></div>
<div class="grid">${spots.map(x=>`<button class="spot ${statusFor(x.id)}">${esc(x.label)}</button>`).join("")}</div>
<h2>Aktiva bilar</h2><div class="tablewrap"><table><tr><th>Bil</th><th>Plats</th><th>Start</th><th>Slut</th><th>Status</th></tr>
${sessions.map(s=>`<tr><td><b>${esc(s.plate)}</b></td><td>${esc(s.parking_spots?.label)}</td><td>${new Date(s.started_at).toLocaleString("sv-SE")}</td>
<td>${new Date(s.ends_at).toLocaleString("sv-SE")}</td><td>${s.status==="expired"?"🔴 Tiden slut":"🟡 Upptagen"}</td></tr>`).join("")||
'<tr><td colspan="5">Inga aktiva parkeringar.</td></tr>'}</table></div><p class="small muted">Uppdateras automatiskt var 5:e sekund.</p>`)}
async function editMap(){panel(`<div class="step">KARTA</div><h1>Bygg 5×5-kartan</h1>
<p>Klicka på en ruta för att växla mellan parkeringsplats och ej använd.</p><div class="grid">${spots.map(x=>
`<button class="spot ${x.type==="blocked"?"blocked":"free"}" onclick="toggleSpot(${x.id})">${esc(x.label)}</button>`).join("")}</div>
<button class="btn" onclick="load()">← Tillbaka</button>`)}
async function toggleSpot(id){let x=spots.find(s=>s.id===id);if(!x)return;let type=x.type==="blocked"?"parking":"blocked";
let {error}=await sb.from("parking_spots").update({type}).eq("id",id);if(error)return alert(error.message);load()}
load();setInterval(load,5000);