
som **sista raden**.

Det är Markdown-kodblock som råkat hamna inne i själva JavaScript-filen. Webbläsaren försöker då tolka `````js````` som JavaScript och kraschar direkt. Det förklarar mycket väl varför du bara får **loggan + "Personal"**. :contentReference[oaicite:0]{index=0}

Jag ser också att `config.js` nu faktiskt har **rätt URL**, precis som du sa. :contentReference[oaicite:1]{index=1} Och `personal.html` laddar filerna i rätt ordning. :contentReference[oaicite:2]{index=2}

Så jag skulle **inte ändra Supabase eller HTML alls**.

### Här är den korrigerade `personal.js`

Den här versionen har:
- bort Markdown-raderna som förstör JavaScriptet
- ingen automatisk `setInterval`
- kartbyggaren stannar kvar
- klick på en parkeringsruta stannar kvar i kartbyggaren
- vanlig personalsida fungerar fortfarande
- `Tillbaka` fungerar
- Supabase-anropen är kvar

:::writing{variant="document" id="73164" title="Korrigerad personal.js"}
const { createClient } = supabase;

const sb = createClient(
  window.SUPABASE_URL,
  window.SUPABASE_PUBLISHABLE_KEY
);

const app = document.getElementById("app");

let spots = [];
let sessions = [];
let mapMode = false;

const esc = s =>
  String(s ?? "").replace(
    /[&<>"']/g,
    m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m])
  );

function panel(x) {
  app.innerHTML = '<section class="panel">' + x + "</section>";
}

async function load() {
  const a = await sb
    .from("parking_spots")
    .select("*")
    .order("position");

  if (a.error) {
    return panel(
      "<h2>Databasfel</h2><p>" +
      esc(a.error.message) +
      "</p>"
    );
  }

  spots = a.data || [];

  const b = await sb
    .from("parking_sessions")
    .select("*,parking_spots(label)")
    .in("status", ["active", "expired"])
    .order("ends_at");

  if (b.error) {
    return panel(
      "<h2>Databasfel</h2><p>" +
      esc(b.error.message) +
      "</p>"
    );
  }

  sessions = b.data || [];

  if (mapMode) {
    renderMap();
  } else {
    render();
  }
}

function statusFor(id) {
  const s = sessions.find(x => x.spot_id === id);

  if (!s) return "free";

  if (
    s.status === "expired" ||
    new Date(s.ends_at) < new Date()
  ) {
    return "expired";
  }

  return "busy";
}

function render() {
  panel(`
    <div class="actions">
      <div>
        <div class="step">PERSONAL</div>
        <h1>P-husets kontroll</h1>
        <p>Här ser du platser, bilar och tider.</p>
      </div>

      <button class="btn secondary" onclick="editMap()">
        ⚙ Bygg karta
      </button>
    </div>

    <div class="legend">
      <span>
        <i class="dot" style="background:#55c98a"></i>
        Ledig
      </span>

      <span>
        <i class="dot" style="background:#e7c84b"></i>
        Upptagen
      </span>

      <span>
        <i class="dot" style="background:#e35d5d"></i>
        Tiden slut
      </span>
    </div>

    <div class="grid">
      ${spots
        .map(
          x =>
            `<button class="spot ${statusFor(x.id)}">
              ${esc(x.label)}
            </button>`
        )
        .join("")}
    </div>

    <h2>Aktiva bilar</h2>

    <div class="tablewrap">
      <table>
        <tr>
          <th>Bil</th>
          <th>Plats</th>
          <th>Start</th>
          <th>Slut</th>
          <th>Status</th>
        </tr>

        ${
          sessions.map(
            s => `
              <tr>
                <td><b>${esc(s.plate)}</b></td>
                <td>${esc(s.parking_spots?.label)}</td>
                <td>${new Date(s.started_at).toLocaleString("sv-SE")}</td>
                <td>${new Date(s.ends_at).toLocaleString("sv-SE")}</td>
                <td>
                  ${
                    s.status === "expired"
                      ? "🔴 Tiden slut"
                      : "🟡 Upptagen"
                  }
                </td>
              </tr>
            `
          ).join("") ||
          '<tr><td colspan="5">Inga aktiva parkeringar.</td></tr>'
        }
      </table>
    </div>

    <p class="small muted">
      Automatisk uppdatering är avstängd medan vi bygger kartan.
    </p>
  `);
}

function renderMap() {
  panel(`
    <div class="step">KARTA</div>

    <h1>Bygg 5×5-kartan</h1>

    <p>
      Klicka på en ruta för att växla mellan
      parkeringsplats och ej använd.
    </p>

    <div class="grid">
      ${spots
        .map(
          x => `
            <button
              class="spot ${x.type === "blocked" ? "blocked" : "free"}"
              onclick="toggleSpot(${x.id})"
            >
              ${esc(x.label)}
            </button>
          `
        )
        .join("")}
    </div>

    <button class="btn" onclick="exitMap()">
      ← Tillbaka
    </button>
  `);
}

function editMap() {
  mapMode = true;
  renderMap();
}

function exitMap() {
  mapMode = false;
  render();
}

async function toggleSpot(id) {
  const x = spots.find(s => s.id === id);

  if (!x) return;

  const type =
    x.type === "blocked"
      ? "parking"
      : "blocked";

  const { error } = await sb
    .from("parking_spots")
    .update({ type })
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  x.type = type;

  renderMap();
}

load();
:::

**Viktigt:** När du klistrar in den i GitHub ska första raden vara:

```text
const { createClient } = supabase;
