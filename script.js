/* --- CONSTANTE HAUTEUR --- */
const HAUTEUR_CRENEAU = 80;

/* --- Couleurs des matières --- */
const matieresCouleurs = {
  "Français": "#FF7F7F","Anglais": "#87CEFA","Espagnol": "#FF0000","Allemand":"#F227F5",
  "Philosophie":"#4e4e4e","Mathématiques":"#0000FF","SVT":"#008000","SNT":"#A9A9A9",
  "PC":"#8A2BE2","Ens.Sci.":"#9400D3","Histoire-géo":"#D9B225","Sport":"#8B4513",
  "SES":"#FFA500","EMC":"#00008B","Principalat":"#000000","HGGSP":"#257FD9",
  "HLP":"#CAD925","Arts Plastiques":"#4B0082","Musique":"#00FFFF","AMC":"#000033"
};

/* --- Données synchronisées --- */
let data = { classe: {}, prof: {}, salle: {} };
let currentView = "classe";
let currentEntity = "";

/* --- Utils --- */
const uid = () => Math.random().toString(36).substring(2, 9);
const select = id => document.getElementById("select-" + id).value;
const input = id => document.getElementById("input-" + id).value.trim();

/* --- Ajouter un cours (multi-classes via virgules) --- */
document.getElementById("ajouter-cours-btn").onclick = () => {
  const matiere = select("matiere"),
    jour = select("jour"),
    start = +select("creneau"),
    nb = +select("nbCreneaux"),
    prof = input("prof"),
    salle = input("salle"),
    semaine = select("semaine");

  const classes = input("classe")
    .split(',')
    .map(c => c.trim())
    .filter(c => c !== "");

  if (classes.length === 0 || !prof) {
    alert("⚠️ Remplis au moins une classe et un professeur !");
    return;
  }

  const globalId = uid();
  const cBase = {
    id: globalId,
    matiere,
    jour,
    startIndex: start,
    nbCreneaux: nb,
    prof,
    salle: salle || "",
    classes,
    semaine,
    bg: matieresCouleurs[matiere]
  };

  // Ajout pour chaque classe
  classes.forEach(classe => {
    if (!data.classe[classe]) data.classe[classe] = [];
    data.classe[classe].push({ ...cBase, classe });
  });

  // Vue prof : un seul objet, même s’il y a plusieurs classes
  if (prof) {
    if (!data.prof[prof]) data.prof[prof] = [];
    data.prof[prof].push({ ...cBase });
  }

  // Vue salle : un seul objet également
  if (salle) {
    if (!data.salle[salle]) data.salle[salle] = [];
    data.salle[salle].push({ ...cBase });
  }

  save();
  majEntity();
  render();
};

/* --- Supprimer un cours partout (par id global, sans pop-up) --- */
function removeCourseById(id) {
  ["classe", "prof", "salle"].forEach(t => {
    Object.keys(data[t]).forEach(n => {
      data[t][n] = data[t][n].filter(c => c.id !== id);
    });
  });
  save();
  render();
}

/* --- Supprimer uniquement l’entité sélectionnée (emploi du temps) --- */
document.getElementById("clear-storage-btn").onclick = () => {
  if (!currentView || !currentEntity) return alert("Sélectionne une entité avant de supprimer.");
  if (!data[currentView][currentEntity]) return;

  // Récupère tous les IDs des cours de cette entité
  const idsToRemove = data[currentView][currentEntity].map(c => c.id);

  // Supprime ces cours dans TOUTES les vues (classe, prof, salle)
  ["classe", "prof", "salle"].forEach(t => {
    Object.keys(data[t]).forEach(n => {
      data[t][n] = data[t][n].filter(c => !idsToRemove.includes(c.id));
    });
  });

  // Supprime l'entité elle-même
  delete data[currentView][currentEntity];
  save();
  currentEntity = "";
  majEntity();
  render();
};

/* --- Construire un bloc DOM pour un cours --- */
function buildBlocFromCourse(c, view) {
  const bloc = document.createElement("div");
  bloc.className = "cours";
  bloc.dataset.id = c.id;
  bloc.dataset.startIndex = c.startIndex;
  bloc.dataset.nbCreneaux = c.nbCreneaux;
  bloc.dataset.jour = c.jour;
  bloc.dataset.matiere = c.matiere;
  bloc.dataset.prof = c.prof;
  bloc.dataset.salle = c.salle;
  bloc.dataset.classes = (Array.isArray(c.classes) ? c.classes.join(", ") : c.classes || c.classe || "");
  bloc.dataset.semaine = c.semaine;

  bloc.style.backgroundColor = c.bg || "#607D8B";
  const colorUpper = bloc.style.backgroundColor.toUpperCase();
  bloc.style.color = ["#FFFFFF", "#FFFF00", "#CCFF00", "#F5DEB3", "#00FFFF"].includes(colorUpper) ? "#000" : "#fff";

  let contenu = `<strong>${c.matiere}</strong><div style="font-size:13px;margin-top:4px">`;
  if (view === "classe") contenu += `${c.prof}${c.salle ? " • " + c.salle : ""}`;
  else if (view === "prof") contenu += `${Array.isArray(c.classes) ? c.classes.join(", ") : c.classe}${c.salle ? " • " + c.salle : ""}`;
  else contenu += `${c.prof}${Array.isArray(c.classes) ? " • " + c.classes.join(", ") : c.classe ? " • " + c.classe : ""}`;
  contenu += `</div><small style="display:block;margin-top:4px">${c.semaine || ""}</small>`;
  bloc.innerHTML = contenu;

  const btn = document.createElement("button");
  btn.className = "supprimer-cours";
  btn.textContent = "Supprimer";
  btn.onclick = () => removeCourseById(c.id);
  bloc.appendChild(btn);

  bloc.style.position = "absolute";
  bloc.style.top = "0";
  bloc.style.height = (HAUTEUR_CRENEAU * c.nbCreneaux) + "px";
  return bloc;
}

/* --- Rendu --- */
function render() {
  document.querySelectorAll("#emploiDuTempsTable td").forEach(td => { td.innerHTML = ""; td.style.display = ""; td.removeAttribute("rowspan"); });
  if (!currentEntity || !data[currentView][currentEntity]) return;
  const courses = data[currentView][currentEntity];

  courses.forEach(c => {
    const td = document.querySelector(`tr[data-creneau="${c.startIndex}"] td[data-jour="${c.jour}"]`);
    if (!td) return;
    const bloc = buildBlocFromCourse(c, currentView);
    td.appendChild(bloc);
  });

  // Fusion verticale (rowspan)
  document.querySelectorAll("#emploiDuTempsTable td").forEach(td => {
    const blocs = Array.from(td.querySelectorAll(".cours"));
    if (!blocs.length) return;
    const maxNb = Math.max(...blocs.map(b => parseInt(b.dataset.nbCreneaux || "1", 10)));
    if (maxNb > 1) {
      td.setAttribute("rowspan", String(maxNb));
      const tr = td.closest("tr"), startIdx = parseInt(tr.dataset.creneau, 10);
      for (let i = 1; i < maxNb; i++) {
        const nextTd = document.querySelector(`tr[data-creneau="${startIdx + i}"] td[data-jour="${td.dataset.jour}"]`);
        if (nextTd) nextTd.style.display = "none";
      }
    }
  });

  // Cohabitation horizontale
  const groups = {};
  document.querySelectorAll(".cours").forEach(b => {
    const key = `${b.dataset.startIndex}__${b.dataset.jour}`;
    groups[key] = groups[key] || [];
    groups[key].push(b);
  });
  Object.values(groups).forEach(group => {
    const nb = group.length;
    group.forEach((bloc, i) => {
      bloc.style.width = (100 / nb) + "%";
      bloc.style.left = (i * (100 / nb)) + "%";
      bloc.style.height = (HAUTEUR_CRENEAU * parseInt(bloc.dataset.nbCreneaux || "1")) + "px";
      bloc.style.display = "";
    });
  });
}

/* --- Gestion des entités et vues --- */
function majEntity() {
  const s = document.getElementById("select-entity");
  s.innerHTML = "";
  Object.keys(data[currentView]).forEach(n => {
    const o = document.createElement("option");
    o.value = n; o.textContent = n;
    s.appendChild(o);
  });

  if (!currentEntity || !data[currentView][currentEntity]) {
    currentEntity = s.options[0] ? s.options[0].value : "";
  } else s.value = currentEntity;
  render();
}

document.getElementById("select-view").onchange = e => { currentView = e.target.value; majEntity(); };
document.getElementById("select-entity").onchange = e => { currentEntity = e.target.value; render(); };

/* --- Sauvegarde locale --- */
function save() { localStorage.setItem("emploiSynchro", JSON.stringify(data)); }
function load() { const s = localStorage.getItem("emploiSynchro"); if (s) data = JSON.parse(s); majEntity(); }
/* --- Bouton de réinitialisation GLOBAL (reset total) --- */
document.getElementById("reset-all-btn").onclick = () => {
  if (!confirm("⚠️ Réinitialiser TOUT l'emploi du temps (toutes classes, profs, salles) ?")) return;
  data = { classe: {}, prof: {}, salle: {} };
  localStorage.removeItem("emploiSynchro");
  currentEntity = "";
  save();
  majEntity();
  render();
};

/* --- Export JSON --- */
document.getElementById("exporter-btn").onclick = () => {
  const b = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const u = URL.createObjectURL(b);
  const a = document.createElement("a");
  a.href = u; a.download = "emplois_synchro.json"; a.click();
  URL.revokeObjectURL(u);
};

/* --- Import JSON --- */
document.getElementById("importer-btn").onclick = () => document.getElementById("importer-fichier").click();
document.getElementById("importer-fichier").onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = ev => { try { data = JSON.parse(ev.target.result); save(); majEntity(); } catch { alert("❌ Fichier invalide !"); } };
  r.readAsText(f);
};

/* --- Export PDF --- */
document.getElementById("exporter-pdf-btn").onclick = () => {
  const table = document.getElementById("emploiDuTempsTable");
  const btns = table.querySelectorAll(".supprimer-cours");
  btns.forEach(b => b.style.display = "none");
  html2canvas(table, { scale: 2 }).then(c => {
    const img = c.toDataURL("image/png");
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [c.width, c.height] });
    pdf.addImage(img, "PNG", 0, 0, c.width, c.height);
    pdf.save(`${currentView}_${currentEntity || "emploi"}.pdf`);
    btns.forEach(b => b.style.display = "inline-block");
  });
};

/* --- Initialisation --- */
load();
