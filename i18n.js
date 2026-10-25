// Vertalingen. De sleutels zijn de Nederlandse teksten (standaardtaal); hieronder staat de Engelse versie.
const KEY = 'spullenzoeker-taal';
let lang = 'nl';
try { const s = localStorage.getItem(KEY); if (s === 'en' || s === 'nl') lang = s; } catch { /* geen opslag beschikbaar */ }

export const getLang = () => lang;
export const localeTag = () => (lang === 'en' ? 'en-GB' : 'nl-NL');
export function setLang(l) {
  lang = l === 'en' ? 'en' : 'nl';
  try { localStorage.setItem(KEY, lang); } catch { /* negeren */ }
}

const fill = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m)) : s);
// Waarden in `vars` worden niet geescaped: geef ze al veilig (esc) door.
export const t = (nl, vars) => fill(lang === 'en' ? (EN[nl] ?? nl) : nl, vars);
// Enkelvoud/meervoud: kiest op basis van n en vult {n} in.
export const tn = (n, one, many, vars) => t(n === 1 ? one : many, { n, ...vars });

export const EN = {
  // tabs en titels
  'Home': 'Home', 'Items': 'Items', 'Locaties': 'Locations', 'Instellingen': 'Settings',
  '☁️ Gesynchroniseerd': '☁️ Synced', '📱 Lokaal': '📱 Local',
  // standaard categorieen en ruimtes
  'Gereedschap': 'Tools', 'Reizen': 'Travel', 'Kleding': 'Clothing', 'Keuken': 'Kitchen', 'Elektronica': 'Electronics',
  'Documenten': 'Documents', 'Schoonmaak': 'Cleaning', 'Hobby': 'Hobbies', 'Overig': 'Other',
  'Slaapkamer': 'Bedroom', 'Woonkamer': 'Living room', 'Badkamer': 'Bathroom', 'Hal': 'Hallway', 'Zolder': 'Attic',
  'Berging': 'Storage room', 'Garage': 'Garage', 'Werkkamer': 'Study', 'Kelder': 'Basement',
  // meldingen
  'Geen toestemming. Publiceer de Firestore-regels.': 'No permission. Publish the Firestore rules.',
  'Opslaan mislukt. Controleer je verbinding.': 'Saving failed. Check your connection.',
  'Geen toegang tot de database. Publiceer de Firestore-regels.': 'No access to the database. Publish the Firestore rules.',
  'Synchroniseren mislukt.': 'Syncing failed.',
  'Sync niet beschikbaar, lokale modus': 'Sync not available, local mode',
  'Geen locatie': 'No location',
  // welkomstscherm
  'Welkom bij Spullenzoeker': 'Welcome to Spullenzoeker',
  'Nooit meer zoeken naar die ene boormachine. Hier houd je bij wat er in welke kast ligt, zodat je alles altijd terugvindt.':
    'Never search for that one drill again. Keep track of what is in which cupboard, so you can always find it.',
  'Begin met je opbergplekken': 'Start with your storage spots',
  'Tik op "Locatie toevoegen". Kies de ruimte (bijvoorbeeld Slaapkamer), geef de kast een naam en een kleur, en voeg vakken toe, zoals "Plank 1 (bovenste)".':
    'Tap "Add location". Choose the room (for example Bedroom), give the cupboard a name and a colour, and add compartments, such as "Shelf 1 (top)".',
  'Voeg je spullen toe': 'Add your things',
  'Tik op "Item toevoegen" en kies een locatie, vak, categorie en icoon. Op de startpagina tik je op een kast om de vakken te openen en op een vak om de inhoud te zien.':
    'Tap "Add item" and choose a location, compartment, category and icon. On the home page, tap a cupboard to open its compartments and tap a compartment to see what is inside.',
  'Vind alles terug': 'Find everything again',
  'Typ in de zoekbalk bovenaan. Je vindt spullen op naam, categorie, plek of de naam van degene die het geleend heeft.':
    'Type in the search bar at the top. You can find things by name, category, place or the name of the person who borrowed them.',
  'Uitlenen en verplaatsen': 'Lending and moving',
  'Met 🤝 leg je vast aan wie je iets uitleent en sinds wanneer. Met ↔️ verplaats je een item naar een andere plek en met 🗑️ verwijder je het.':
    'Use 🤝 to record who you lend something to and since when. Use ↔️ to move an item to another place and 🗑️ to delete it.',
  'Op al je apparaten': 'On all your devices',
  'Log op je telefoon en laptop in met hetzelfde account, dan staat alles overal gelijk. Deze uitleg kun je altijd opnieuw bekijken via Instellingen.':
    'Log in with the same account on your phone and laptop and everything stays in sync. You can view this guide again at any time in Settings.',
  'Alles blijft bij je': 'Everything stays with you',
  'Je gegevens worden op dit apparaat bewaard. Maak regelmatig een back-up via Instellingen. Deze uitleg kun je daar ook opnieuw bekijken.':
    'Your data is stored on this device. Make a backup regularly in Settings. You can also view this guide again there.',
  'Aan de slag': 'Get started', 'Volgende': 'Next', 'Overslaan': 'Skip',
  // items en lijsten
  'Teruggebracht': 'Returned', 'Uitlenen': 'Lend out', 'Verplaatsen': 'Move', 'Verwijderen': 'Delete', 'Bewerken': 'Edit',
  'Uitgeleend aan {to} sinds {since} ({n} dag)': 'Lent to {to} since {since} ({n} day)',
  'Uitgeleend aan {to} sinds {since} ({n} dagen)': 'Lent to {to} since {since} ({n} days)',
  'Zoek in al je spullen...': 'Search all your things...',
  '+ Item toevoegen': '+ Add item', '+ Locatie toevoegen': '+ Add location',
  '{n} item uitgeleend': '{n} item lent out', '{n} items uitgeleend': '{n} items lent out', 'Bekijk ›': 'View ›',
  '{n} resultaat': '{n} result', '{n} resultaten': '{n} results',
  'Niets gevonden voor "{q}"': 'Nothing found for "{q}"',
  'Nog geen locaties. Voeg je eerste kast of opbergplek toe.': 'No locations yet. Add your first cupboard or storage spot.',
  '{n} vak': '{n} compartment', '{n} vakken': '{n} compartments', '{n} item': '{n} item', '{n} items': '{n} items',
  'Geen vakken. Bewerk de locatie om vakken toe te voegen.': 'No compartments. Edit the location to add some.',
  'Leeg': 'Empty', '+ Item in dit vak': '+ Item in this compartment',
  'Alles': 'All', 'Uitgeleend': 'Lent out',
  'Zoek in items...': 'Search items...', 'Alle categorieën': 'All categories', '+ Item': '+ Item',
  'Niets uitgeleend. Tik op 🤝 bij een item om het uit te lenen.': 'Nothing lent out. Tap 🤝 on an item to lend it.',
  'Geen items gevonden': 'No items found', 'Nog geen items toegevoegd': 'No items added yet',
  'Geen vakken': 'No compartments', 'Nog geen locaties': 'No locations yet', '+ Locatie': '+ Location',
  // instellingen
  'Synchronisatie': 'Sync',
  'Ingelogd als {email}. Je gegevens worden gesynchroniseerd tussen al je apparaten.': 'Logged in as {email}. Your data is synced across all your devices.',
  'Uitloggen': 'Log out',
  'De app draait nu <b>lokaal</b>: gegevens staan alleen op dit apparaat. Vul <code>firebase-config.js</code> in om te synchroniseren tussen telefoon en laptop.':
    'The app is now running <b>locally</b>: data is only stored on this device. Fill in <code>firebase-config.js</code> to sync between phone and laptop.',
  'Taal': 'Language',
  'Uitleg': 'Guide', 'Bekijk de korte rondleiding door de app nog eens.': 'Take the short tour of the app again.', 'Rondleiding bekijken': 'View tour',
  'Categorieën': 'Categories', '+ Categorie toevoegen': '+ Add category',
  'Back-up': 'Backup', 'Exporteren': 'Export', 'Importeren': 'Import',
  'Statistieken': 'Statistics', '{n} locatie': '{n} location', '{n} locaties': '{n} locations', '{n} uitgeleend': '{n} lent out',
  // formulieren
  'Kleur': 'Colour', 'Eigen kleur': 'Custom colour',
  'Locatie bewerken': 'Edit location', 'Locatie toevoegen': 'Add location', 'Ruimte': 'Room', 'Bijv. Slaapkamer': 'E.g. Bedroom',
  'Naam van de kast of plek': 'Name of the cupboard or spot', 'Bijv. Kast 1 (links)': 'E.g. Closet 1 (left)',
  'Vakken (bijv. Plank 1 bovenste)': 'Compartments (e.g. Shelf 1 (top))', 'Bijv. Plank 1 (bovenste)': 'E.g. Shelf 1 (top)',
  '+ Vak toevoegen': '+ Add compartment', 'Annuleren': 'Cancel', 'Opslaan': 'Save',
  'Maak eerst een locatie aan': 'Create a location first',
  'Item bewerken': 'Edit item', 'Item toevoegen': 'Add item', 'Naam': 'Name', 'Bijv. Accuboormachine': 'E.g. Cordless drill',
  'Aantal': 'Quantity', 'Categorie': 'Category', 'Geen': 'None', 'Icoon': 'Icon', 'Locatie': 'Location', 'Vak': 'Compartment',
  'Notitie (optioneel)': 'Note (optional)', '(geen vakken)': '(no compartments)',
  '{name} ligt nu bij: {path}': '{name} is currently at: {path}', 'Nieuwe locatie': 'New location',
  'Uitgeleend aan': 'Lent to', 'Bijv. Jan': 'E.g. Sam', 'Sinds': 'Since', 'Bijv. terug voor de verhuizing': 'E.g. back before the move',
  'Categorie bewerken': 'Edit category', 'Categorie toevoegen': 'Add category',
  // inloggen
  'Inloggen': 'Log in', 'Gebruik hetzelfde account op al je apparaten om te synchroniseren.': 'Use the same account on all your devices to sync.',
  'E-mailadres': 'Email address', 'Wachtwoord': 'Password', 'Account maken': 'Create account',
  'E-mailadres of wachtwoord klopt niet.': 'Email address or password is incorrect.',
  'Dit account bestaat al. Log in.': 'This account already exists. Log in.',
  'Kies een wachtwoord van minimaal 6 tekens.': 'Choose a password of at least 6 characters.',
  'Geen verbinding.': 'No connection.', 'Inloggen is mislukt.': 'Logging in failed.',
  // bevestigingen en meldingen
  '"{name}" verwijderen?': 'Delete "{name}"?',
  '"{name}" verwijderen, inclusief {n} item?': 'Delete "{name}", including {n} item?',
  '"{name}" verwijderen, inclusief {n} items?': 'Delete "{name}", including {n} items?',
  'Locatie verwijderd': 'Location deleted', 'Item verwijderd': 'Item deleted', 'Item verplaatst': 'Item moved',
  'Is "{name}" teruggebracht door {who}?': 'Has "{name}" been returned by {who}?',
  'Categorie "{name}" verwijderen?': 'Delete category "{name}"?',
  'Categorie "{name}" verwijderen? {n} item(s) raken hun categorie kwijt.': 'Delete category "{name}"? {n} item(s) will lose their category.',
  'Verplaats eerst de items uit: {names}': 'Move the items out of these first: {names}',
  'Dit vervangt al je huidige gegevens. Doorgaan?': 'This replaces all your current data. Continue?',
  'Back-up teruggezet': 'Backup restored', 'Dit bestand kan niet worden gelezen.': 'This file cannot be read.'
};
