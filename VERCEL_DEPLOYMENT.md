# Torolalana amin'ny Fandefasana ao amin'ny Vercel (Guide de Déploiement Vercel)

Ny tetikasa **ASSISTANTE VIRTUELLE IA** dia efa vonona tanteraka ampiasaina sy halefa mivantana ao amin'ny **Vercel**, indrindra ho an'ny **Meta Webhook** sy **Facebook Messenger**.

---

## 1. Nahoana no nanao Erreur tamin'ny Facebook Developers teo aloha ?
Rehefa nanindry "Vérifier et enregistrer" tao amin'ny `developers.facebook.com` ianao, dia nanao **Erreur 500 (`FUNCTION_INVOCATION_FAILED`)** ny Vercel satria :
- Nisy `import app from '../server.js'` izay tsy hitan'i Vercel tamin'ny runtime.
- **Efa namboarina tanteraka izany ankehitriny** :
  - Noforonina ny **`/api/webhooks/facebook.ts`** natokana sy haingana dia haingana ho an'ny Vercel.
  - Navaozina ny **`vercel.json`** sy ny **`api/index.ts`** mba hahazaka ny Webhook Meta 100% tsy misy fianjerana na dia kely aza.

---

## 2. Dingana Fandefasana amin'ny Vercel (Déploiement)

### Safidy A : Amin'ny alalan'ny GitHub (Mora indrindra)
1. **Push / Sync to GitHub** :
   - Alefaso amin'ny GitHub ny fanavaozana vaovao (`git add .`, `git commit -m "Fix Vercel Meta webhook"`, `git push`).
2. Ny Vercel dia hanao **Redeploy** ho azy ao anatin'ny 30 segondra.

### Safidy B : Amin'ny alalan'ny Vercel CLI
```bash
vercel --prod
```

---

## 3. Fanamarinana ao amin'ny Meta Facebook Developers

Raha vantany vao vita ny Deployment ao amin'ny Vercel :
1. Mandehana ao amin'ny **developers.facebook.com** > Ny Application-nao > **Messenger** > **Paramètres (Settings)** > **Webhooks**.
2. Ampidiro :
   - **Callback URL** : `https://agence-virtuelle.vercel.app/api/webhooks/facebook`
   - **Verify Token** : `assistante_virtuelle_webhook_verify_token`
3. Tsindrio ny **« Vérifier et enregistrer »** :
   - Hahazo **marika maitso ✓** avy hatrany ianao !
4. Ao amin'ny **Webhook fields**, mariho (cocher) ireto :
   - `messages`
   - `messaging_postbacks`
   - `feed`
