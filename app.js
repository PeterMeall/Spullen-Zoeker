import { firebaseConfig } from './firebase-config.js';
import { t, tn, getLang, setLang, localeTag, EN } from './i18n.js';

/* ---------- hulpjes ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const makeCollator = () => new Intl.Collator(localeTag(), { sensitivity: 'base', numeric: true });
let collator = makeCollator();
const byName = (a, b) => collator.compare(a.name || '', b.name || '');

const COLORS = ['#A0441F', '#B45A12', '#A58B5F', '#3A6528', '#6B8F71', '#2F6F62', '#3B5B7E', '#7A3566', '#B5485D', '#4A3D33'];
const ICONS = ['📦', '🔧', '🛠️', '🔨', '🪛', '🔌', '💡', '🔋', '🧳', '☂️', '🧢', '🧣', '🧤', '👕', '👖', '👟', '🧦', '🛏️', '🧸', '🎲',
  '📚', '📄', '📁', '🖊️', '🍽️', '🍳', '🥣', '☕', '🧴', '🧼', '🧹', '🧽', '🪣', '💊', '🩹', '📷', '🎧', '💻', '🎮', '⚽',
  '🚲', '⛺', '🎒', '🎁', '🕯️', '🪴', '🖼️', '🧵', '✂️', '🔑', '🗝️', '📱'];
// Standaardcategorieen worden aangemaakt in de taal die op dat moment actief is.
const DEFAULT_CATS = () => [
  { name: t('Gereedschap'), icon: '🔧' }, { name: t('Reizen'), icon: '🧳' }, { name: t('Kleding'), icon: '👕' },
  { name: t('Keuken'), icon: '🍽️' }, { name: t('Elektronica'), icon: '🔌' }, { name: t('Documenten'), icon: '📄' },
  { name: t('Schoonmaak'), icon: '🧹' }, { name: t('Hobby'), icon: '🎲' }, { name: t('Overig'), icon: '📦' }
];
// Trefwoorden (NL en EN) waarmee automatisch een icoon wordt gekozen. Engelse eerst, zodat "pants" niet op "pan" valt.
const KEYWORDS = {
  drill: '🛠️', hammer: '🔨', screw: '🪛', pliers: '🔧', umbrella: '☂️', suitcase: '🧳', backpack: '🎒', tent: '⛺', beanie: '🧢', scarf: '🧣',
  glove: '🧤', trouser: '👖', pants: '👖', jeans: '👖', shoe: '👟', sock: '🧦', lamp: '💡', battery: '🔋', cable: '🔌', charger: '🔌', book: '📚',
  passport: '📄', candle: '🕯️', bike: '🚲', camera: '📷', headphone: '🎧', game: '🎲', medicine: '💊', plaster: '🩹',
  key: '🔑', scissors: '✂️', thread: '🧵', soap: '🧼', broom: '🧹', bucket: '🪣', bowl: '🥣', mug: '☕', gift: '🎁', present: '🎁',
  boor: '🛠️', hamer: '🔨', schroef: '🪛', tang: '🔧', paraplu: '☂️', koffer: '🧳', rugzak: '🎒', muts: '🧢', sjaal: '🧣',
  handschoen: '🧤', shirt: '👕', broek: '👖', schoen: '👟', sok: '🧦', batterij: '🔋', kabel: '🔌', oplader: '🔌', boek: '📚',
  paspoort: '📄', kaars: '🕯️', plant: '🪴', fiets: '🚲', koptelefoon: '🎧', spel: '🎲', medicijn: '💊', pleister: '🩹',
  sleutel: '🔑', schaar: '✂️', garen: '🧵', zeep: '🧼', bezem: '🧹', emmer: '🪣', pan: '🍳', kom: '🥣', beker: '☕', cadeau: '🎁'
};

const ROOM_HINTS = () => ['Slaapkamer', 'Woonkamer', 'Keuken', 'Badkamer', 'Hal', 'Zolder', 'Berging', 'Garage', 'Werkkamer', 'Kelder'].map(r => t(r));

/* ---------- staat ---------- */
const state = { locations: [], items: [], categories: [] };
const ui = { tab: 'home', q: '', itemQ: '', itemCat: '', itemView: 'all', expLoc: new Set(), expSec: new Set() };
let store;
let seeded = false;

/* ---------- opslag: lokaal ---------- */
function makeLocalStore() {
  const KEY = 'spullenzoeker-v1';
  const save = () => localStorage.setItem(KEY, JSON.stringify({ locations: state.locations, items: state.items, categories: state.categories }));
  return {
    mode: 'local',
    async start() {
      let d = {};
      try { d = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { d = {}; }
      ['locations', 'items', 'categories'].forEach(c => state[c] = d[c] || []);
      if (!state.categories.length) { state.categories = DEFAULT_CATS().map(c => ({ ...c, id: uid() })); save(); }
      changed();
    },
    async put(col, obj) {
      const i = state[col].findIndex(x => x.id === obj.id);
      if (i >= 0) state[col][i] = obj; else state[col].push(obj);
      save(); changed();
    },
    async remove(col, id) { state[col] = state[col].filter(x => x.id !== id); save(); changed(); },
    async replaceAll(d) { ['locations', 'items', 'categories'].forEach(c => state[c] = d[c] || []); save(); changed(); }
  };
}

/* ---------- opslag: Firebase (sync) ---------- */
async function makeCloudStore() {
  const V = '10.14.1';
  const [appM, authM, fsM] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`)
  ]);
  const app = appM.initializeApp(firebaseConfig);
  const auth = authM.getAuth(app);
  const db = fsM.initializeFirestore(app, { localCache: fsM.persistentLocalCache({ tabManager: fsM.persistentMultipleTabManager() }) });
  const COLS = ['locations', 'items', 'categories'];
  let unsubs = [];
  let user = null;
  const ref = (col, id) => fsM.doc(db, 'users', user.uid, col, id);
  // Niet wachten op de server: de lokale cache toont de wijziging direct. Fouten worden getoond.
  const guard = p => {
    p.catch(e => {
      console.error(e);
      toast(e?.code === 'permission-denied' ? t('Geen toestemming. Publiceer de Firestore-regels.') : t('Opslaan mislukt. Controleer je verbinding.'));
    });
    return Promise.resolve();
  };
  return {
    mode: 'cloud',
    get user() { return user; },
    start() {
      authM.onAuthStateChanged(auth, u => {
        user = u;
        unsubs.forEach(f => f()); unsubs = [];
        if (!u) { COLS.forEach(c => state[c] = []); showLogin(); changed(); return; }
        hideLogin();
        COLS.forEach(c => {
          unsubs.push(fsM.onSnapshot(fsM.collection(db, 'users', u.uid, c), snap => {
            state[c] = snap.docs.map(d => d.data());
            if (c === 'categories' && !state.categories.length && !snap.metadata.fromCache && !seeded) {
              seeded = true;
              DEFAULT_CATS().forEach(k => { const o = { ...k, id: uid() }; fsM.setDoc(ref('categories', o.id), o); });
            }
            changed();
          }, err => {
            console.error(err);
            toast(err?.code === 'permission-denied' ? t('Geen toegang tot de database. Publiceer de Firestore-regels.') : t('Synchroniseren mislukt.'));
          }));
        });
      });
    },
    put(col, obj) { return guard(fsM.setDoc(ref(col, obj.id), obj)); },
    remove(col, id) { return guard(fsM.deleteDoc(ref(col, id))); },
    async replaceAll(d) {
      for (const c of COLS) {
        for (const o of state[c]) guard(fsM.deleteDoc(ref(c, o.id)));
        for (const o of (d[c] || [])) guard(fsM.setDoc(ref(c, o.id), o));
      }
    },
    login: (email, pw) => authM.signInWithEmailAndPassword(auth, email, pw),
    register: (email, pw) => authM.createUserWithEmailAndPassword(auth, email, pw),
    logout: () => authM.signOut(auth)
  };
}

/* ---------- afgeleide data ---------- */
const catOf = id => state.categories.find(c => c.id === id);
const locOf = id => state.locations.find(l => l.id === id);
const secOf = (loc, sid) => loc?.sections?.find(s => s.id === sid);
function pathOf(it) {
  const l = locOf(it.locationId);
  if (!l) return t('Geen locatie');
  const s = secOf(l, it.sectionId);
  return [l.room, l.name, s?.name].filter(Boolean).join(' › ');
}
const sortedLocs = () => [...state.locations].sort((a, b) => collator.compare(a.room, b.room) || byName(a, b));
const itemsIn = (locId, secId) => state.items.filter(i => i.locationId === locId && (secId === undefined || i.sectionId === secId));
const icoOf = it => it.icon || catOf(it.category)?.icon || '📦';

function hl(text, q) {
  const tx = esc(text);
  if (!q) return tx;
  const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
  return tx.replace(re, '<mark>$1</mark>');
}
const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const fmtDate = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString(localeTag(), { day: 'numeric', month: 'short', year: 'numeric' }) : '';
function daysSince(iso) {
  if (!iso) return 0;
  return Math.max(0, Math.round((new Date(todayISO() + 'T12:00:00') - new Date(iso + 'T12:00:00')) / 86400000));
}
const lentItems = () => state.items.filter(i => i.lent).sort((a, b) => (a.lent.since || '').localeCompare(b.lent.since || ''));
function searchItems(q, catId = '', lentOnly = false) {
  const s = q.trim().toLowerCase();
  return state.items.filter(it => {
    if (lentOnly && !it.lent) return false;
    if (catId && it.category !== catId) return false;
    if (!s) return true;
    const hay = [it.name, it.notes, catOf(it.category)?.name, pathOf(it), it.lent ? 'uitgeleend lent ' + it.lent.to : ''].join(' ').toLowerCase();
    return s.split(/\s+/).every(w => hay.includes(w));
  }).sort(byName);
}

/* ---------- UI hulpjes ---------- */
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.remove('hidden');
  clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.add('hidden'), 2200);
}
function openModal(html) { $('#sheet').innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); $('#sheet').innerHTML = ''; }
const langSwitch = () => `<div class="seg">
  <button type="button" data-act="setLang" data-lang="nl" class="${getLang() === 'nl' ? 'on' : ''}">Nederlands</button>
  <button type="button" data-act="setLang" data-lang="en" class="${getLang() === 'en' ? 'on' : ''}">English</button></div>`;

/* ---------- welkomstscherm ---------- */
const WKEY = 'spullenzoeker-welkom';
let welcomeChecked = false;
let welcomeStep = 0;
const welcomeSlides = () => [
  { icon: '🗄️', title: t('Welkom bij Spullenzoeker'), text: t('Nooit meer zoeken naar die ene boormachine. Hier houd je bij wat er in welke kast ligt, zodat je alles altijd terugvindt.') },
  { icon: '📍', title: t('Begin met je opbergplekken'), text: t('Tik op "Locatie toevoegen". Kies de ruimte (bijvoorbeeld Slaapkamer), geef de kast een naam en een kleur, en voeg vakken toe, zoals "Plank 1 (bovenste)".') },
  { icon: '📦', title: t('Voeg je spullen toe'), text: t('Tik op "Item toevoegen" en kies een locatie, vak, categorie en icoon. Op de startpagina tik je op een kast om de vakken te openen en op een vak om de inhoud te zien.') },
  { icon: '🔍', title: t('Vind alles terug'), text: t('Typ in de zoekbalk bovenaan. Je vindt spullen op naam, categorie, plek of de naam van degene die het geleend heeft.') },
  { icon: '🤝', title: t('Uitlenen en verplaatsen'), text: t('Met 🤝 leg je vast aan wie je iets uitleent en sinds wanneer. Met ↔️ verplaats je een item naar een andere plek en met 🗑️ verwijder je het.') },
  store?.mode === 'cloud'
    ? { icon: '☁️', title: t('Op al je apparaten'), text: t('Log op je telefoon en laptop in met hetzelfde account, dan staat alles overal gelijk. Deze uitleg kun je altijd opnieuw bekijken via Instellingen.') }
    : { icon: '📱', title: t('Alles blijft bij je'), text: t('Je gegevens worden op dit apparaat bewaard. Maak regelmatig een back-up via Instellingen. Deze uitleg kun je daar ook opnieuw bekijken.') }
];
function showWelcome(step = 0) {
  welcomeStep = step;
  const slides = welcomeSlides(), s = slides[step], last = step === slides.length - 1;
  $('#welcomesheet').innerHTML = `<div class="wel">
    <div class="big">${s.icon}</div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p>
    <div class="dots">${slides.map((_, i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('')}</div>
    <div class="actions"><button class="btn primary" data-act="${last ? 'welcomeDone' : 'welcomeNext'}" data-step="${step + 1}">${last ? t('Aan de slag') : t('Volgende')}</button></div>
    ${last ? '' : `<button class="skip" data-act="welcomeSkip">${t('Overslaan')}</button>`}
    <div style="margin-top:14px">${langSwitch()}</div>
  </div>`;
  $('#welcome').classList.remove('hidden');
}
function endWelcome() {
  $('#welcome').classList.add('hidden');
  try { localStorage.setItem(WKEY, '1'); } catch { /* geen opslag beschikbaar */ }
}
function maybeWelcome() {
  if (welcomeChecked || !store) return;
  if (store.mode === 'cloud' && !store.user) return;
  welcomeChecked = true;
  let seen = false;
  try { seen = localStorage.getItem(WKEY) === '1'; } catch { /* negeren */ }
  if (!seen) showWelcome(0);
}

/* ---------- weergave ---------- */
const TITLES = { home: 'Spullenzoeker', items: 'Items', locations: 'Locaties', settings: 'Instellingen' };
const TAB_LABELS = { home: ['🏠', 'Home'], items: ['📦', 'Items'], locations: ['📍', 'Locaties'], settings: ['⚙️', 'Instellingen'] };

function changed() { render(); }

function render() {
  document.documentElement.lang = getLang();
  $('#title').textContent = ui.tab === 'home' ? 'Spullenzoeker' : t(TITLES[ui.tab]);
  document.querySelectorAll('#tabbar button').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === ui.tab);
    const [ic, label] = TAB_LABELS[b.dataset.tab];
    b.innerHTML = `<span>${ic}</span>${t(label)}`;
  });
  $('#syncbadge').textContent = store?.mode === 'cloud' ? t('☁️ Gesynchroniseerd') : t('📱 Lokaal');
  const v = $('#view');
  if (ui.tab === 'home') v.innerHTML = homeView();
  if (ui.tab === 'items') v.innerHTML = itemsView();
  if (ui.tab === 'locations') v.innerHTML = locationsView();
  if (ui.tab === 'settings') v.innerHTML = settingsView();
  if (ui.tab === 'home') renderHomeBody();
  if (ui.tab === 'items') renderItemsBody();
  maybeWelcome();
}

function itemRow(it, q = '', showPath = false) {
  const c = catOf(it.category);
  const lentLine = it.lent ? tn(daysSince(it.lent.since), 'Uitgeleend aan {to} sinds {since} ({n} dag)', 'Uitgeleend aan {to} sinds {since} ({n} dagen)',
    { to: `<b>${hl(it.lent.to, q)}</b>`, since: fmtDate(it.lent.since) }) : '';
  return `<div class="item">
    <div class="ic">${esc(icoOf(it))}</div>
    <div class="grow" data-act="editItem" data-id="${it.id}" style="cursor:pointer">
      <div class="name">${hl(it.name, q)}${it.qty > 1 ? ` <span class="muted">× ${it.qty}</span>` : ''}</div>
      ${showPath ? `<div class="path">${hl(pathOf(it), q)}</div>` : ''}
      ${c ? `<span class="chip">${esc(c.icon)} ${esc(c.name)}</span>` : ''}
      ${it.lent ? `<div class="lent">🤝 ${lentLine}${it.lent.note ? ` · ${esc(it.lent.note)}` : ''}</div>` : ''}
    </div>
    ${it.lent
      ? `<button class="iconbtn" title="${t('Teruggebracht')}" data-act="returnItem" data-id="${it.id}">✅</button>`
      : `<button class="iconbtn" title="${t('Uitlenen')}" data-act="lendItem" data-id="${it.id}">🤝</button>`}
    <button class="iconbtn" title="${t('Verplaatsen')}" data-act="moveItem" data-id="${it.id}">↔️</button>
    <button class="iconbtn" title="${t('Verwijderen')}" data-act="delItem" data-id="${it.id}">🗑️</button>
  </div>`;
}

function homeView() {
  const nLent = lentItems().length;
  return `<div class="searchbar"><input id="q" type="search" placeholder="${t('Zoek in al je spullen...')}" value="${esc(ui.q)}" autocomplete="off"></div>
  <div class="btnrow">
    <button class="btn primary" data-act="addItem">${t('+ Item toevoegen')}</button>
    <button class="btn" data-act="addLoc">${t('+ Locatie toevoegen')}</button>
  </div>
  ${nLent ? `<button class="lentbanner" data-act="showLent">🤝 ${tn(nLent, '{n} item uitgeleend', '{n} items uitgeleend')} <span>${t('Bekijk ›')}</span></button>` : ''}
  <div id="homeBody"></div>`;
}

function renderHomeBody() {
  const el = $('#homeBody'); if (!el) return;
  const q = ui.q.trim();
  if (q) {
    const res = searchItems(q);
    el.innerHTML = res.length
      ? `<h2 class="room">${tn(res.length, '{n} resultaat', '{n} resultaten')}</h2><div class="list">${res.map(i => itemRow(i, q, true)).join('')}</div>`
      : `<div class="empty"><b>🔍</b>${t('Niets gevonden voor "{q}"', { q: esc(q) })}</div>`;
    return;
  }
  const locs = sortedLocs();
  if (!locs.length) {
    el.innerHTML = `<div class="empty"><b>🗄️</b>${t('Nog geen locaties. Voeg je eerste kast of opbergplek toe.')}</div>`;
    return;
  }
  const rooms = [...new Set(locs.map(l => l.room))];
  el.innerHTML = rooms.map(r => `<h2 class="room">${esc(r)}</h2><div class="loc-grid">${locs.filter(l => l.room === r).map(locCard).join('')}</div>`).join('');
}

function locCard(l) {
  const open = ui.expLoc.has(l.id);
  const total = itemsIn(l.id).length;
  const secs = l.sections || [];
  return `<div class="card ${open ? 'open' : ''}" style="--c:${esc(l.color)}">
    <button class="loc-head" data-act="toggleLoc" data-id="${l.id}">
      <div class="grow"><b>${esc(l.name)}</b><br><small>${tn(secs.length, '{n} vak', '{n} vakken')} · ${tn(total, '{n} item', '{n} items')}</small></div>
      <span class="chev">›</span>
    </button>
    ${open ? `<div class="sections">${secs.length ? secs.map(s => secBlock(l, s)).join('') : `<div class="empty" style="padding:14px">${t('Geen vakken. Bewerk de locatie om vakken toe te voegen.')}</div>`}</div>` : ''}
  </div>`;
}
function secBlock(l, s) {
  const key = l.id + ':' + s.id;
  const open = ui.expSec.has(key);
  const its = itemsIn(l.id, s.id).sort(byName);
  return `<div class="sec">
    <button class="sec-head" data-act="toggleSec" data-key="${key}"><span>${esc(s.name)}</span><span class="count">${its.length}</span></button>
    ${open ? `<div class="items">${its.length ? its.map(i => itemRow(i)).join('') : `<div class="muted" style="padding:6px">${t('Leeg')}</div>`}
      <button class="btn small block" data-act="addItem" data-loc="${l.id}" data-sec="${s.id}">${t('+ Item in dit vak')}</button></div>` : ''}
  </div>`;
}

function itemsView() {
  return `<div class="seg">
    <button data-act="itemView" data-v="all" class="${ui.itemView === 'all' ? 'on' : ''}">${t('Alles')} (${state.items.length})</button>
    <button data-act="itemView" data-v="lent" class="${ui.itemView === 'lent' ? 'on' : ''}">🤝 ${t('Uitgeleend')} (${lentItems().length})</button>
  </div>
  <div class="filters">
    <input id="iq" type="search" placeholder="${t('Zoek in items...')}" value="${esc(ui.itemQ)}" autocomplete="off">
    <select id="icat"><option value="">${t('Alle categorieën')}</option>${[...state.categories].sort(byName).map(c => `<option value="${c.id}" ${ui.itemCat === c.id ? 'selected' : ''}>${esc(c.icon)} ${esc(c.name)}</option>`).join('')}</select>
  </div>
  <div id="itemsBody"></div>
  <button class="btn primary fab" data-act="addItem">${t('+ Item')}</button>`;
}
function renderItemsBody() {
  const el = $('#itemsBody'); if (!el) return;
  const lentOnly = ui.itemView === 'lent';
  const res = searchItems(ui.itemQ, ui.itemCat, lentOnly);
  if (lentOnly) res.sort((a, b) => (a.lent.since || '').localeCompare(b.lent.since || ''));
  el.innerHTML = res.length
    ? `<div class="list">${res.map(i => itemRow(i, ui.itemQ.trim(), true)).join('')}</div>`
    : lentOnly
      ? `<div class="empty"><b>🤝</b>${t('Niets uitgeleend. Tik op 🤝 bij een item om het uit te lenen.')}</div>`
      : `<div class="empty"><b>📦</b>${state.items.length ? t('Geen items gevonden') : t('Nog geen items toegevoegd')}</div>`;
}

function locationsView() {
  const locs = sortedLocs();
  const rooms = [...new Set(locs.map(l => l.room))];
  return `${locs.length ? rooms.map(r => `<h2 class="room">${esc(r)}</h2>${locs.filter(l => l.room === r).map(l => `
    <div class="card" style="--c:${esc(l.color)}"><div class="item" style="padding:12px 14px">
      <div class="grow"><b>${esc(l.name)}</b><br><small class="muted">${(l.sections || []).map(s => esc(s.name)).join(', ') || t('Geen vakken')} · ${tn(itemsIn(l.id).length, '{n} item', '{n} items')}</small></div>
      <button class="iconbtn" title="${t('Bewerken')}" data-act="editLoc" data-id="${l.id}">✏️</button>
      <button class="iconbtn" title="${t('Verwijderen')}" data-act="delLoc" data-id="${l.id}">🗑️</button>
    </div></div>`).join('')}`).join('') : `<div class="empty"><b>🗄️</b>${t('Nog geen locaties')}</div>`}
  <button class="btn primary fab" data-act="addLoc">${t('+ Locatie')}</button>`;
}

function settingsView() {
  const cloud = store.mode === 'cloud';
  const nSecs = state.locations.reduce((n, l) => n + (l.sections || []).length, 0);
  return `
  <div class="settings-block"><h3>${t('Taal')}</h3>${langSwitch()}</div>
  <div class="settings-block"><h3>${t('Synchronisatie')}</h3>
    ${cloud
      ? `<p>${t('Ingelogd als {email}. Je gegevens worden gesynchroniseerd tussen al je apparaten.', { email: `<b>${esc(store.user?.email || '')}</b>` })}</p><button class="btn" data-act="logout">${t('Uitloggen')}</button>`
      : `<p>${t('De app draait nu <b>lokaal</b>: gegevens staan alleen op dit apparaat. Vul <code>firebase-config.js</code> in om te synchroniseren tussen telefoon en laptop.')}</p>`}
  </div>
  <div class="settings-block"><h3>${t('Uitleg')}</h3>
    <p class="muted">${t('Bekijk de korte rondleiding door de app nog eens.')}</p>
    <button class="btn" data-act="showWelcome">${t('Rondleiding bekijken')}</button>
  </div>
  <div class="settings-block"><h3>${t('Categorieën')}</h3>
    ${[...state.categories].sort(byName).map(c => `<div class="catrow"><span style="font-size:1.4rem">${esc(c.icon)}</span><span class="grow">${esc(c.name)}</span>
      <button class="iconbtn" data-act="editCat" data-id="${c.id}">✏️</button><button class="iconbtn" data-act="delCat" data-id="${c.id}">🗑️</button></div>`).join('')}
    <button class="btn block" data-act="addCat">${t('+ Categorie toevoegen')}</button>
  </div>
  <div class="settings-block"><h3>${t('Back-up')}</h3>
    <div class="row2"><button class="btn" data-act="export">${t('Exporteren')}</button><button class="btn" data-act="import">${t('Importeren')}</button></div>
    <input type="file" id="importfile" accept="application/json" class="hidden" style="display:none">
  </div>
  <div class="settings-block"><h3>${t('Statistieken')}</h3>
    <p class="muted">${tn(state.locations.length, '{n} locatie', '{n} locaties')} · ${tn(nSecs, '{n} vak', '{n} vakken')} · ${tn(state.items.length, '{n} item', '{n} items')} · ${t('{n} uitgeleend', { n: lentItems().length })}</p>
  </div>`;
}

/* ---------- formulieren ---------- */
function swatches(selected) {
  return `<div class="swatches">${COLORS.map(c => `<button type="button" class="sw ${c === selected ? 'sel' : ''}" style="background:${c}" data-act="pickColor" data-color="${c}" aria-label="${t('Kleur')}"></button>`).join('')}
  <input type="color" class="sw-custom" data-act="customColor" value="${selected}" title="${t('Eigen kleur')}"></div>`;
}
function iconGrid(selected) {
  return `<div class="icons">${ICONS.map(i => `<button type="button" class="ico ${i === selected ? 'sel' : ''}" data-act="pickIcon" data-icon="${i}">${i}</button>`).join('')}</div>`;
}
const formActions = okLabel => `<div class="actions"><button type="button" class="btn" data-act="closeModal">${t('Annuleren')}</button><button class="btn primary">${okLabel}</button></div>`;

function locForm(id) {
  const l = id ? locOf(id) : { room: '', name: '', color: COLORS[0], sections: [{ id: uid(), name: '' }] };
  openModal(`<h3>${id ? t('Locatie bewerken') : t('Locatie toevoegen')}</h3>
  <form data-form="loc" data-id="${id || ''}">
    <label>${t('Ruimte')}</label>
    <input name="room" list="rooms" required placeholder="${t('Bijv. Slaapkamer')}" value="${esc(l.room)}">
    <datalist id="rooms">${[...new Set([...ROOM_HINTS(), ...state.locations.map(x => x.room)])].map(r => `<option value="${esc(r)}">`).join('')}</datalist>
    <label>${t('Naam van de kast of plek')}</label>
    <input name="name" required placeholder="${t('Bijv. Kast 1 (links)')}" value="${esc(l.name)}">
    <label>${t('Kleur')}</label>
    <input type="hidden" name="color" value="${esc(l.color)}">${swatches(l.color)}
    <label>${t('Vakken (bijv. Plank 1 bovenste)')}</label>
    <div id="secrows">${(l.sections || []).map(secRow).join('')}</div>
    <button type="button" class="btn small" data-act="addSecRow">${t('+ Vak toevoegen')}</button>
    ${formActions(t('Opslaan'))}
  </form>`);
}
const secRow = s => `<div class="secrow"><input data-sid="${s.id}" placeholder="${t('Bijv. Plank 1 (bovenste)')}" value="${esc(s.name)}"><button type="button" class="iconbtn" data-act="rmSecRow">✖️</button></div>`;

function itemForm(id, pre = {}) {
  if (!state.locations.length) { toast(t('Maak eerst een locatie aan')); ui.tab = 'locations'; render(); return; }
  const it = id ? state.items.find(i => i.id === id) : { name: '', qty: 1, category: state.categories[0]?.id || '', icon: '', locationId: pre.loc || state.locations[0].id, sectionId: pre.sec || '', notes: '' };
  const locs = sortedLocs();
  openModal(`<h3>${id ? t('Item bewerken') : t('Item toevoegen')}</h3>
  <form data-form="item" data-id="${id || ''}" data-manual="${it.icon ? 1 : 0}">
    <label>${t('Naam')}</label><input name="name" required placeholder="${t('Bijv. Accuboormachine')}" value="${esc(it.name)}" autocomplete="off">
    <div class="row2"><div><label>${t('Aantal')}</label><input name="qty" type="number" min="1" value="${it.qty || 1}"></div>
    <div><label>${t('Categorie')}</label><select name="category"><option value="">${t('Geen')}</option>${[...state.categories].sort(byName).map(c => `<option value="${c.id}" ${c.id === it.category ? 'selected' : ''}>${esc(c.icon)} ${esc(c.name)}</option>`).join('')}</select></div></div>
    <label>${t('Icoon')}</label><input type="hidden" name="icon" value="${esc(it.icon || '')}">${iconGrid(it.icon || '')}
    <label>${t('Locatie')}</label><select name="locationId">${locs.map(l => `<option value="${l.id}" ${l.id === it.locationId ? 'selected' : ''}>${esc(l.room)} › ${esc(l.name)}</option>`).join('')}</select>
    <label>${t('Vak')}</label><select name="sectionId"></select>
    <label>${t('Notitie (optioneel)')}</label><textarea name="notes" rows="2">${esc(it.notes || '')}</textarea>
    ${formActions(t('Opslaan'))}
  </form>`);
  fillSections($('form[data-form=item]'), it.sectionId);
}
function fillSections(form, selected) {
  const l = locOf(form.locationId.value);
  const sel = form.sectionId;
  sel.innerHTML = (l?.sections || []).map(s => `<option value="${s.id}" ${s.id === selected ? 'selected' : ''}>${esc(s.name)}</option>`).join('') || `<option value="">${t('(geen vakken)')}</option>`;
}

function moveForm(id) {
  const it = state.items.find(i => i.id === id);
  openModal(`<h3>${t('Verplaatsen')}</h3><p class="muted">${t('{name} ligt nu bij: {path}', { name: esc(it.name), path: esc(pathOf(it)) })}</p>
  <form data-form="move" data-id="${id}">
    <label>${t('Nieuwe locatie')}</label><select name="locationId">${sortedLocs().map(l => `<option value="${l.id}" ${l.id === it.locationId ? 'selected' : ''}>${esc(l.room)} › ${esc(l.name)}</option>`).join('')}</select>
    <label>${t('Vak')}</label><select name="sectionId"></select>
    ${formActions(t('Verplaatsen'))}
  </form>`);
  fillSections($('form[data-form=move]'), it.sectionId);
}

function lendForm(id) {
  const it = state.items.find(i => i.id === id);
  const names = [...new Set(state.items.filter(i => i.lent).map(i => i.lent.to))];
  openModal(`<h3>${t('Uitlenen')}</h3><p class="muted">${esc(icoOf(it))} ${esc(it.name)}</p>
  <form data-form="lend" data-id="${id}">
    <label>${t('Uitgeleend aan')}</label><input name="to" required placeholder="${t('Bijv. Jan')}" list="lentnames" autocomplete="off">
    <datalist id="lentnames">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
    <label>${t('Sinds')}</label><input name="since" type="date" required value="${todayISO()}">
    <label>${t('Notitie (optioneel)')}</label><input name="note" placeholder="${t('Bijv. terug voor de verhuizing')}">
    ${formActions(t('Uitlenen'))}
  </form>`);
}

function catForm(id) {
  const c = id ? catOf(id) : { name: '', icon: '📦' };
  openModal(`<h3>${id ? t('Categorie bewerken') : t('Categorie toevoegen')}</h3>
  <form data-form="cat" data-id="${id || ''}">
    <label>${t('Naam')}</label><input name="name" required value="${esc(c.name)}">
    <label>${t('Icoon')}</label><input type="hidden" name="icon" value="${esc(c.icon)}">${iconGrid(c.icon)}
    ${formActions(t('Opslaan'))}
  </form>`);
}

/* ---------- inloggen ---------- */
function showLogin() {
  $('#loginsheet').innerHTML = `<h3>${t('Inloggen')}</h3><p class="muted">${t('Gebruik hetzelfde account op al je apparaten om te synchroniseren.')}</p>
  <form id="loginform"><label>${t('E-mailadres')}</label><input name="email" type="email" required autocomplete="username">
  <label>${t('Wachtwoord')}</label><input name="pw" type="password" required minlength="6" autocomplete="current-password">
  <p id="loginerr" style="color:var(--danger);min-height:1.2em"></p>
  <div class="actions"><button type="button" class="btn" id="regbtn">${t('Account maken')}</button><button class="btn primary">${t('Inloggen')}</button></div></form>
  <div style="margin-top:18px">${langSwitch()}</div>`;
  $('#login').classList.remove('hidden');
  const f = $('#loginform');
  const go = async fn => {
    try { await fn(f.email.value.trim(), f.pw.value); }
    catch (e) { $('#loginerr').textContent = authMsg(e.code); }
  };
  f.onsubmit = e => { e.preventDefault(); go(store.login); };
  $('#regbtn').onclick = () => { if (f.reportValidity()) go(store.register); };
}
function hideLogin() { $('#login').classList.add('hidden'); }
function authMsg(code = '') {
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return t('E-mailadres of wachtwoord klopt niet.');
  if (code.includes('email-already-in-use')) return t('Dit account bestaat al. Log in.');
  if (code.includes('weak-password')) return t('Kies een wachtwoord van minimaal 6 tekens.');
  if (code.includes('network')) return t('Geen verbinding.');
  return t('Inloggen is mislukt.');
}

/* ---------- taal wisselen ---------- */
function changeLang(l) {
  const wasLogin = !$('#login').classList.contains('hidden');
  const wasWelcome = !$('#welcome').classList.contains('hidden');
  const email = wasLogin ? ($('#loginform')?.email.value || '') : '';
  const prev = getLang();
  setLang(l);
  collator = makeCollator();
  // Ongewijzigde standaardcategorieen krijgen de naam in de nieuwe taal; eigen namen blijven staan.
  const defaults = ['Gereedschap', 'Reizen', 'Kleding', 'Keuken', 'Elektronica', 'Documenten', 'Schoonmaak', 'Hobby', 'Overig'];
  if (prev !== getLang()) {
    for (const c of state.categories) {
      const k = defaults.find(d => c.name === (prev === 'en' ? EN[d] : d));
      if (k && t(k) !== c.name) store.put('categories', { ...c, name: t(k) });
    }
  }
  render();
  if (wasLogin) { showLogin(); $('#loginform').email.value = email; }
  if (wasWelcome) showWelcome(welcomeStep);
}

/* ---------- acties ---------- */
const actions = {
  setLang: d => changeLang(d.lang),
  showWelcome: () => showWelcome(0),
  welcomeNext: d => showWelcome(+d.step),
  welcomeSkip: () => endWelcome(),
  welcomeDone: () => { endWelcome(); if (!state.locations.length) locForm(); },
  tab: d => { ui.tab = d.tab; render(); window.scrollTo(0, 0); },
  toggleLoc: d => { ui.expLoc.has(d.id) ? ui.expLoc.delete(d.id) : ui.expLoc.add(d.id); render(); },
  toggleSec: d => { ui.expSec.has(d.key) ? ui.expSec.delete(d.key) : ui.expSec.add(d.key); render(); },
  closeModal,
  addLoc: () => locForm(),
  editLoc: d => locForm(d.id),
  delLoc: async d => {
    const l = locOf(d.id), n = itemsIn(d.id).length;
    const msg = n ? tn(n, '"{name}" verwijderen, inclusief {n} item?', '"{name}" verwijderen, inclusief {n} items?', { name: l.name }) : t('"{name}" verwijderen?', { name: l.name });
    if (!confirm(msg)) return;
    for (const it of itemsIn(d.id)) await store.remove('items', it.id);
    await store.remove('locations', d.id);
    toast(t('Locatie verwijderd'));
  },
  addItem: d => itemForm(null, { loc: d.loc, sec: d.sec }),
  editItem: d => itemForm(d.id),
  moveItem: d => moveForm(d.id),
  lendItem: d => lendForm(d.id),
  returnItem: async d => {
    const it = state.items.find(i => i.id === d.id);
    if (!confirm(t('Is "{name}" teruggebracht door {who}?', { name: it.name, who: it.lent.to }))) return;
    const { lent, ...rest } = it;
    await store.put('items', rest);
    toast(t('Teruggebracht'));
  },
  itemView: d => { ui.itemView = d.v; render(); },
  showLent: () => { ui.itemView = 'lent'; ui.tab = 'items'; render(); window.scrollTo(0, 0); },
  delItem: async d => {
    const it = state.items.find(i => i.id === d.id);
    if (!confirm(t('"{name}" verwijderen?', { name: it.name }))) return;
    await store.remove('items', d.id); toast(t('Item verwijderd'));
  },
  addCat: () => catForm(),
  editCat: d => catForm(d.id),
  delCat: async d => {
    const c = catOf(d.id), n = state.items.filter(i => i.category === d.id).length;
    const msg = n ? t('Categorie "{name}" verwijderen? {n} item(s) raken hun categorie kwijt.', { name: c.name, n }) : t('Categorie "{name}" verwijderen?', { name: c.name });
    if (!confirm(msg)) return;
    for (const it of state.items.filter(i => i.category === d.id)) await store.put('items', { ...it, category: '' });
    await store.remove('categories', d.id);
  },
  pickColor: (d, el) => {
    const form = el.closest('form'); form.color.value = d.color;
    form.querySelectorAll('.sw').forEach(b => b.classList.toggle('sel', b === el));
  },
  pickIcon: (d, el) => {
    const form = el.closest('form'); form.icon.value = d.icon; form.dataset.manual = 1;
    form.querySelectorAll('.ico').forEach(b => b.classList.toggle('sel', b === el));
  },
  addSecRow: () => { $('#secrows').insertAdjacentHTML('beforeend', secRow({ id: uid(), name: '' })); $('#secrows').lastElementChild.querySelector('input').focus(); },
  rmSecRow: (d, el) => el.closest('.secrow').remove(),
  logout: () => store.logout(),
  export: () => {
    const blob = new Blob([JSON.stringify({ locations: state.locations, items: state.items, categories: state.categories }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `spullenzoeker-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  },
  import: () => $('#importfile').click()
};

document.addEventListener('click', e => {
  if (e.target.id === 'modal') return closeModal();
  const el = e.target.closest('[data-act]');
  if (!el || el.matches('input')) return;
  const fn = actions[el.dataset.act];
  if (fn) fn(el.dataset, el);
});
document.addEventListener('input', e => {
  const tg = e.target;
  if (tg.matches('[data-act=customColor]')) { const f = tg.closest('form'); f.color.value = tg.value; f.querySelectorAll('.sw').forEach(b => b.classList.remove('sel')); }
  if (tg.id === 'q') { ui.q = tg.value; renderHomeBody(); }
  if (tg.id === 'iq') { ui.itemQ = tg.value; renderItemsBody(); }
  const f = tg.closest?.('form[data-form=item]');
  if (f && tg.name === 'name' && f.dataset.manual !== '1') {
    const low = tg.value.toLowerCase();
    const k = Object.keys(KEYWORDS).find(w => low.includes(w));
    if (k) setIcon(f, KEYWORDS[k]);
  }
});
document.addEventListener('change', e => {
  const tg = e.target;
  if (tg.id === 'icat') { ui.itemCat = tg.value; renderItemsBody(); }
  if (tg.id === 'importfile') importFile(tg.files[0]);
  const f = tg.closest?.('form');
  if (!f) return;
  if (tg.name === 'locationId') fillSections(f, '');
  if (tg.name === 'category' && f.dataset.manual !== '1') { const c = catOf(tg.value); if (c) setIcon(f, c.icon); }
});
function setIcon(form, icon) {
  form.icon.value = icon;
  form.querySelectorAll('.ico').forEach(b => b.classList.toggle('sel', b.dataset.icon === icon));
}

document.addEventListener('submit', async e => {
  const f = e.target.closest('form[data-form]'); if (!f) return;
  e.preventDefault();
  const id = f.dataset.id, kind = f.dataset.form;
  if (kind === 'loc') {
    const rows = [...f.querySelectorAll('#secrows input')].map(i => ({ id: i.dataset.sid, name: i.value.trim() })).filter(s => s.name);
    const old = id ? locOf(id) : null;
    const removed = (old?.sections || []).filter(s => !rows.find(r => r.id === s.id) && itemsIn(id, s.id).length);
    if (removed.length) { alert(t('Verplaats eerst de items uit: {names}', { names: removed.map(s => s.name).join(', ') })); return; }
    await store.put('locations', { id: id || uid(), room: f.room.value.trim(), name: f.elements.name.value.trim(), color: f.color.value, sections: rows });
    ui.expLoc.add(id || '');
  }
  if (kind === 'item') {
    const old = id ? state.items.find(i => i.id === id) : {};
    await store.put('items', { ...old, id: id || uid(), name: f.elements.name.value.trim(), qty: Math.max(1, +f.qty.value || 1), category: f.category.value, icon: f.icon.value,
      locationId: f.locationId.value, sectionId: f.sectionId.value, notes: f.notes.value.trim() });
  }
  if (kind === 'move') {
    const it = state.items.find(i => i.id === id);
    await store.put('items', { ...it, locationId: f.locationId.value, sectionId: f.sectionId.value });
    ui.expLoc.add(f.locationId.value); ui.expSec.add(f.locationId.value + ':' + f.sectionId.value);
    toast(t('Item verplaatst'));
  }
  if (kind === 'lend') {
    const it = state.items.find(i => i.id === id);
    await store.put('items', { ...it, lent: { to: f.elements.to.value.trim(), since: f.elements.since.value || todayISO(), note: f.elements.note.value.trim() } });
    toast(t('Uitgeleend'));
  }
  if (kind === 'cat') await store.put('categories', { id: id || uid(), name: f.elements.name.value.trim(), icon: f.icon.value });
  closeModal();
});

async function importFile(file) {
  if (!file) return;
  try {
    const d = JSON.parse(await file.text());
    if (!Array.isArray(d.locations) || !Array.isArray(d.items)) throw new Error('bad');
    if (!confirm(t('Dit vervangt al je huidige gegevens. Doorgaan?'))) return;
    await store.replaceAll({ locations: d.locations, items: d.items, categories: d.categories || [] });
    toast(t('Back-up teruggezet'));
  } catch { alert(t('Dit bestand kan niet worden gelezen.')); }
}

/* ---------- start ---------- */
async function boot() {
  const cloud = firebaseConfig?.apiKey && !firebaseConfig.apiKey.startsWith('VUL');
  try { store = cloud ? await makeCloudStore() : makeLocalStore(); }
  catch { store = makeLocalStore(); toast(t('Sync niet beschikbaar, lokale modus')); }
  render();
  await store.start();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();
