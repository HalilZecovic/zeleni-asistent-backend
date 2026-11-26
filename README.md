# Zeleni Asistent

Backend API za ličnu kolekciju biljaka i kontekstualnog AI savjetnika za njegu. Savjetnik ne daje generičke odgovore: u obzir uzima vrstu biljke, lokaciju, osvjetljenje, bilješke vlasnika i posljednjih deset događaja njege. Razgovori se čuvaju u Supabase bazi i mogu se nastaviti kasnije. API je pripremljen za buduću React Native aplikaciju.

## Tehnologije

- Node.js 20+, Express 5 i JSON REST API.
- Supabase PostgreSQL, Supabase Auth i Row Level Security.
- Zod validacija; OpenAI-kompatibilan Chat Completions API za AI odgovore. API ključ modela ostaje samo na backend serveru.

## Lokalno pokretanje

1. Napravi Supabase projekat.
2. U Supabase **SQL Editor** redom izvrši sve SQL migracije iz `supabase/migrations/`.
3. Kopiraj `.env.example` u `.env` i podesi `SUPABASE_URL` i `SUPABASE_PUBLISHABLE_KEY` iz Supabase Project Settings → API Keys.
4. Instaliraj Node.js 20 ili noviji, pa pokreni:

```bash
npm install
npm test
npm run dev
```

Server podrazumijevano radi na `http://localhost:3000`, a `GET /health` provjerava da li je pokrenut. Na Windows PowerShell-u, ako je `npm.ps1` blokiran, koristi `npm.cmd install`, `npm.cmd test` i `npm.cmd start`.

Za AI endpoint dodaj svoj `AI_API_KEY` u lokalni `.env`; bez njega ostatak backend-a i CRUD funkcije rade, a `/ai/ask` jasno vraća `503 AI_NOT_CONFIGURED`. Podrazumijevani model je `gpt-4o-mini`; po potrebi se mijenjaju `AI_BASE_URL` i `AI_MODEL`. Nikad ne stavljaj Supabase tajni/service-role ključ ili AI API ključ u mobilnu aplikaciju, Git ili Postman. `.env` je ignorisan u Git-u. Odgovori AI-ja su informativni savjeti, ne pouzdana dijagnoza biljnih bolesti.

## Struktura i tok zahtjeva

- `src/server.js` pokreće HTTP server; `src/app.js` dodaje middleware i rute.
- `src/routes/` definiše putanje i HTTP metode.
- `src/controllers/` pretvara rezultat servisa u HTTP/JSON odgovore.
- `src/services/` sadrži poslovnu logiku, Supabase upite i AI provider integraciju.
- `src/middleware/` obrađuje token, validaciju, 404 i greške.
- `src/config/` učitava environment varijable i pravi Supabase klijente.
- `supabase/migrations/` čuva relacijsku šemu, seed vrste, funkcije i RLS pravila.
- `postman/` sadrži uvozivu kolekciju za API demonstraciju.

Tok: HTTP zahtjev → Express middleware → ruta → autentifikacija/validacija → kontroler → servis → Supabase ili AI provider → JSON odgovor. Za pristup tabelama API koristi publishable ključ zajedno sa korisničkim JWT-om; RLS u bazi ograničava privatne podatke na vlasnika.

## Entiteti i bezbjednost podataka

`profiles` je vezan za Supabase Auth korisnika; `plant_species` sadrži katalog vrsta; `user_plants` povezuje vlasnika sa konkretnom biljkom i njenim uslovima; `care_events` bilježi zalivanje i ostalu njegu; `ai_sessions` i `ai_messages` čuvaju razgovore i kontekstualne savjete. Svaki korisnik čita i mijenja samo svoje biljke, događaje njege i AI sesije. Katalog vrsta dostupan je prijavljenim korisnicima.

## API endpointi

Za zaštićene zahtjeve pošalji `Authorization: Bearer <access_token>`.

| Metod | Endpoint | Funkcija |
|---|---|---|
| POST | `/api/v1/auth/register` | Registracija sa emailom, lozinkom i imenom |
| POST | `/api/v1/auth/login` | Prijava i dobijanje access tokena |
| POST | `/api/v1/auth/logout` | Opoziv tekuće sesije |
| GET | `/api/v1/plants/species` | Katalog vrsta biljaka |
| GET/POST | `/api/v1/plants` | Lista mojih biljaka / dodavanje biljke |
| GET/PATCH/DELETE | `/api/v1/plants/:id` | Detalji, izmjena i brisanje moje biljke |
| GET/POST | `/api/v1/plants/:id/care-events` | Istorija njege i novi događaj |
| POST | `/api/v1/ai/ask` | Pitanje o biljci uz kontekst vrste i njege |
| GET | `/api/v1/ai/sessions` | Moji sačuvani AI razgovori |
| GET | `/api/v1/ai/sessions/:id/messages` | Poruke u mom razgovoru |

Tijelo pitanja: `{"question":"Zašto joj žute listovi?","plant_id":"UUID"}`. Za nastavak razgovora dodaje se `session_id`. Odgovor sadrži `data.session_id` i `data.answer`. Za čitanje ili nastavak razgovora primjenjuju se RLS i provjera vlasništva.

## Demonstracija u Postmanu

Uvezi `postman/zeleni-asistent.postman_collection.json`, pokreni server, registruj korisnika i prijavi se. Kopiraj `data.session.access_token` iz odgovora prijave u kolekcijsku varijablu `token`. Zatim dohvati vrste, dodaj biljku, upiši njegu i pitaj AI savjetnika. Sačuvaj `data.id` biljke u `plantId`, `data.id` vrste u `speciesId`, a `data.session_id` AI odgovora u `sessionId`. Za registraciju sa uključenom email potvrdom potvrdi poruku prije prijave.
