# Torolalana amin'ny Fandefasana ao amin'ny Vercel (Guide de Déploiement Vercel)

Ny tetikasa **ASSISTANTE VIRTUELLE IA** dia efa vonona tanteraka ampiasaina sy halefa mivantana ao amin'ny **Vercel**.

---

## 1. Fomba Fandefasana amin'ny alalan'ny GitHub (Déploiement via GitHub - Mora indrindra)

1. **Export / Push to GitHub** :
   - Ao amin'ny menun'ny AI Studio (eo ambony havanana), tsindrio ny **Export** na **GitHub** handefasana ny kaody any amin'ny kaonty GitHub-nao.
2. **Mandehana ao amin'ny Vercel** ([vercel.com](https://vercel.com)) :
   - Midira (Login) amin'ny kaontinao.
   - Tsindrio ny **"Add New..."** > **"Project"**.
   - Safidio ny repository GitHub-nao.
3. **Configurations automatique** :
   - Ny `vercel.json` efa voaomana dia mamantatra avy hatrany :
     - **Framework Preset** : Vite
     - **Build Command** : `vite build`
     - **Output Directory** : `dist`
     - **Serverless API** : `api/index.ts`
4. **Environment Variables (Tsiambaratelo - Tsy voatery)** :
   - Raha manana ianao, ampidiro ao amin'ny Vercel Settings > Environment Variables :
     - `GEMINI_API_KEY` : Ny fanalahidinao Gemini
   - *(Marihina fa afaka ampidirina sy ovaina mivantana ao amin'ny site ihany koa ireo fanalahidy rehetra ao amin'ny menu "Configuration Clés & Site")*.
5. Tsindrio ny **Deploy** !

---

## 2. Fomba Fandefasana amin'ny alalan'ny Vercel CLI (Déploiement via Vercel CLI)

Raha mampiasa terminal ianao :

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
vercel

# 3. Deploy to Production
vercel --prod
```

---

## 3. Firafitry ny Vercel ao amin'ny Tetikasa (Structure de Déploiement)

- **`vercel.json`** : Mandrindra ny fiantsoana ny API (`/api/*`) mankany amin'ny Serverless Function, ary ny pejy rehetra (`/*`) mankany amin'ny Frontend Vite.
- **`api/index.ts`** : Point d'entrée ho an'ny Serverless Function Express Node.js amin'ny Vercel.
- **`server.ts`** : Miasa ho an'ny fampandehanana anatiny sy ny Cloud Run / Docker.
- **`dist/`** : Vokatra static haingana dia haingana amin'ny Vercel Edge Network.
