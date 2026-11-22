# ⚡ DIY Gig Radar — Punk, Hardcore & Metal Konzert-Aggregator

Zentraler Konzert-Scanner und Kalender für Punk, Hardcore, Metal, D-Beat, Crust und DIY-Shows.
Bündelt Termine von:
- **Ask A Punk Berlin** (DIY Shows, Solikonzerte)
- **Knox Punk/Hardcore DB** (Über 400 Termine bundesweit)
- **Stressfaktor Squat** (Autonome Zentren, Hausprojekte)
- **Radar Squat Berlin** (DIY Live-Gigs & Soliparties)
- **Metal.de** (Metal-Touren & Festivaldaten)
- **M.A.D. Tourbooking** (Hardcore & Punk Touren wie Terror, Madball, Agnostic Front)
- **Core Tex Records** (Kreuzberger Punk & Hardcore Ticket-Vorverkauf)
- **TixForGigs** (Club- & Subkultur-Gigs)
- **Eventim Hard & Heavy** (Große Touren & Clubkonzerte)

---

## 🚀 Installation & Deployment

Du hast zwei Möglichkeiten, die App zu betreiben:

### Option A: Klassischer Webspace (FTP / Apache / Nginx / Strato / All-Inkl / Hetzner)
**Wichtig:** Ein normaler Webspace hat in der Regel kein aktives Node.js im Hintergrund. Deshalb wurde die App so gebaut, dass sie als **reine statische Web-App** funktioniert:

1. **Build erstellen:**
   ```bash
   npm install
   npm run build
   ```
2. **Dateien hochladen:**
   Lade **nur den Inhalt des Ordners `dist/`** per FTP in dein Web-Verzeichnis (z. B. `public_html` oder `htdocs`) hoch:
   - `dist/index.html`
   - `dist/assets/`
   - `dist/events-snapshot.json`
3. **Fertig!**
   - Die App öffnet sich sofort im Browser mit hunderten aktuellen Konzertterminen (bereits vorab gebündelt).
   - Filter, Suche, Kalenderexport (.ics / Google Calendar) und Benachrichtigungsregeln laufen komplett client-seitig.
   - Der Button **"Quellen abchecken"** nutzt im Browser automatisch CORS-Proxies, um die Seiten live zu prüfen.

---

### Option B: Netlify (Empfohlen – in 1 Minute online)
Dank `netlify.toml` und integrierter Snapshot-/Browser-Scanner-Engine läuft die App direkt auf Netlify:

**Weg 1 – Über GitHub (Automatisches Deployment):**
1. Lade das Projekt in ein GitHub-Repository hoch.
2. Klicke in Netlify auf **"Add new site" → "Import an existing project"**.
3. Wähle dein Repository aus – Netlify erkennt über `netlify.toml` automatisch:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Klicke auf **"Deploy site"**.

**Weg 2 – Direkt per Drag & Drop (Ohne GitHub):**
1. Im Projektordner lokal einmal ausführen:
   ```bash
   npm install
   npm run build
   ```
2. Öffne **[app.netlify.com/drop](https://app.netlify.com/drop)** im Browser.
3. Ziehe einfach den entstandenen **`dist`**-Ordner ins Browserfenster – fertig!

---

### Option C: Node.js-Server (Uberspace, VPS, Docker, Railway, Render)
Wenn du einen Server mit Node.js hast:

1. Projektordner auf den Server kopieren oder klonen.
2. Abhängigkeiten installieren:
   ```bash
   npm install
   ```
3. Server starten:
   ```bash
   npm run dev
   # oder für dauerhaften Betrieb:
   npx tsx server.ts
   ```
4. Der Server läuft standardmäßig auf Port 3000 und crawlt alle Quellen mit integrierter Node.js Cheerio/Fetch-Engine (inkl. Proof-of-Work Challenge-Solver für Core Tex Records).

---

## 🎸 Features
- **Live-Scan:** Prüft alle Quellen auf Knopfdruck.
- **Filter:** Nach Datum (Heute, Morgen, Wochenende, Monat), Location, Genre und Stadt.
- **Benachrichtigungen:** Eigene Stichwort-Alarme (z.B. nach Band, Club oder Genre) mit Web-Audio Gitarrenchime & Browser-Push.
- **Export:** 1-Klick Export nach Google Calendar oder Download als `.ics` Datei für Apple Kalender / Outlook.
- **AI Gig Scout:** Findet mit Gemini passende Untergrund-Shows zu deinen Lieblingsbands.
