# WorkTracker – Setup

## 1. Supabase (databáze)

1. Jdi na https://supabase.com a vytvoř účet (zdarma)
2. Klikni **New Project** → pojmenuj ho (např. `worktracker`) → vyber region EU
3. Po vytvoření jdi do **SQL Editor** a spusť:

```sql
CREATE TABLE app_data (
  key  text PRIMARY KEY,
  value jsonb NOT NULL
);
```

4. Jdi do **Project Settings → API** a zkopíruj:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** klíč → `VITE_SUPABASE_ANON_KEY`

5. Vytvoř soubor `.env` v kořeni projektu:

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxxxxx...
```

---

## 2. Lokální spuštění

```bash
npm install
npm run dev
```

Otevři http://localhost:5173

---

## 3. GitHub

```bash
git init
git add .
git commit -m "initial commit"
```

Na https://github.com vytvoř nové repo (bez README), pak:

```bash
git remote add origin https://github.com/TVŮJ-ÚČET/worktracker.git
git branch -M main
git push -u origin main
```

---

## 4. Deploy na Vercel (hosting zdarma)

1. Jdi na https://vercel.com a přihlas se přes GitHub
2. Klikni **Add New Project** → vyber repo `worktracker`
3. Před deployem přidej environment variables:
   - `VITE_SUPABASE_URL` = tvoje URL
   - `VITE_SUPABASE_ANON_KEY` = tvůj klíč
4. Klikni **Deploy**

Každý push na GitHub = automatický nový deploy. ✓
