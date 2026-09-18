# Torolalana amin'ny Fandefasana ao amin'ny Vercel sy Facebook Login

Ny tetikasa **ASSISTANTE VIRTUELLE IA** dia efa vonona tanteraka ampiasaina ao amin'ny **https://agence-virtuelle.vercel.app/**.

---

## 🔑 Ahoana no fomba fampandehanana ny Facebook Login amin'ny Vercel (tsy misy olan'ny "Tsy Admin") ?

Raha nahazo fampitandremana ianao teo aloha hoe *"tsy admin an'ny projet"* tao amin'ny Firebase Console, dia **aza manahy mihitsy** satria **tsy mila manova na inona na inona ao amin'ny Firebase Console ianao** ! 

Ity no fomba fanao ao amin'ny **Meta Developers (developers.facebook.com)** :

### 1. Fampidirana ny URI ao amin'ny Meta Facebook Login :
1. Sokafy ny **https://developers.facebook.com/apps**
2. Fidio ny App-nao > Tsindrio ny **Facebook Login** > **Paramètres (Settings)**
3. Ao amin'ny **URI de redirection OAuth valides (Valid OAuth Redirect URIs)**, apetaho ireto rohy ireto :
   - `https://project-223f4dee-65dd-4c9e-8cc.firebaseapp.com/__/auth/handler` *(TENA ILAY MANAN-DANJA ho an'ny Firebase Auth)*
   - `https://agence-virtuelle.vercel.app/api/auth/facebook/callback`
   - `https://agence-virtuelle.vercel.app/auth/facebook/callback`
4. Tsindrio ny **Enregistrer les modifications (Save Changes)** eo ambany.

### 2. Fampidirana ny Domaine ao amin'ny Paramètres Généraux :
1. Ao amin'ny ankavia, tsindrio ny **Paramètres > Général (Settings > Basic)**.
2. Ao amin'ny **Domaines de l'application (App Domains)**, ampidiro :
   - `agence-virtuelle.vercel.app`
3. Ao amin'ny **URL du site web (Site URL)** (eo amin'ny farany ambany ao amin'ny Plateforme Web), ampidiro :
   - `https://agence-virtuelle.vercel.app/`
4. Ao amin'ny **Politique de confidentialité (Privacy Policy URL)**, ampidiro :
   - `https://agence-virtuelle.vercel.app/privacy-policy`
5. Ao amin'ny **Conditions d'utilisation (Terms of Service URL)**, ampidiro :
   - `https://agence-virtuelle.vercel.app/terms`
6. Ao amin'ny **Suppression des données utilisateur (Data Deletion)**, safidio ny *URL d'instructions* :
   - `https://agence-virtuelle.vercel.app/data-deletion`
7. Tsindrio ny **Enregistrer les modifications**.

---

## 3. Webhooks Facebook Messenger ao amin'ny Vercel

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

