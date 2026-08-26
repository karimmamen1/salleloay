# Salle des Fêtes Louay — Gestion des Réservations

Application interne bilingue (français/arabe RTL) pour gérer les réservations de **Salle des Fêtes Louay / قاعة الأفراح لؤي**. Elle utilise Next.js App Router, TypeScript, Firebase Authentication, Cloud Firestore, callable Cloud Functions, App Check et Firebase Hosting.

## Fonctionnalités

- Connexion sécurisée par nom d'utilisateur et mot de passe (l'email Firebase interne reste invisible).
- Rôles `super_admin` et `admin`, comptes actifs/désactivés et claims Firebase.
- Calendrier mensuel temps réel : vert = disponible, rouge = réservé, une seule réservation par date.
- Création, édition et déplacement transactionnels pour empêcher les doubles réservations.
- Suppression réservée au Super Admin, avec instantané dans l'audit.
- Informations client, événement, invités, finances en DZD, cuisinier, serveurs et **Ménage en prix**.
- Recherche, filtres, tableau/cartes responsive, statistiques et prochaines réservations.
- Gestion sécurisée des administrateurs et réinitialisation de mot de passe par Cloud Functions.
- Audit privé Super Admin, écoute Firestore en temps réel, mode hors connexion en lecture seulement.
- Interface française/arabe RTL et PWA installable avec icônes et service worker.

## Prérequis

- Node.js 22 LTS
- npm
- Java 21+ pour Firestore Emulator
- Firebase CLI (`npm install -g firebase-tools` ou `npx firebase ...`)
- Le forfait Spark suffit pour l'authentification, Firestore et la gestion des réservations. Le forfait **Blaze** reste nécessaire pour les Cloud Functions de gestion des administrateurs et l'intégration Next.js de Firebase Hosting.

## 1. Installation

```bash
npm install
cd functions && npm install && cd ..
cp .env.local.example .env.local
```

## 2. Créer et configurer le projet Firebase

Dans [Firebase Console](https://console.firebase.google.com/) :

1. Créez un projet (par exemple `salle-loay-reservations`).
2. Ajoutez une application **Web** nommée `Salle Louay Web`.
3. Dans **Authentication → Sign-in method**, activez **Email/Password**. Les administrateurs continueront à utiliser uniquement leur nom d'utilisateur dans l'application.
4. Dans **Firestore Database**, créez une base en mode Production et choisissez une région proche compatible (par exemple `eur3`).
5. Pour gérer les comptes administrateurs depuis l'application ou déployer l'intégration Next.js de Firebase Hosting, passez au forfait Blaze et activez Cloud Functions. La gestion des réservations fonctionne sans cette étape.
6. Dans **App Check**, enregistrez l'application Web avec reCAPTCHA Enterprise. Ajoutez ensuite la clé de site dans `.env.local`.
7. Ajoutez les domaines Firebase Hosting et votre futur domaine personnalisé aux domaines autorisés d'Authentication.

Le dépôt est déjà lié à l'identifiant Google Cloud créé pour ce projet :

```json
{ "projects": { "default": "salle-loay-gestion-2026" } }
```

## 3. Variables d'environnement

Copiez la configuration de l'application Web Firebase dans `.env.local` :

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION=europe-west1
NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY=
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false
```

Les valeurs `NEXT_PUBLIC_*` identifient l'application Web et ne sont pas des clés administrateur. Ne placez jamais de clé privée, mot de passe ou JSON de compte de service dans Git.

## 4. Déployer les règles, indexes et fonctions

```bash
firebase login
firebase use salle-loay-gestion-2026
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only functions
```

Les règles sont déjà incluses dans `firestore.rules`. Les réservations sont modifiées par des transactions Firestore protégées par des règles qui vérifient l'identité, le profil actif, le rôle, les champs autorisés et les timestamps serveur. Les opérations sensibles sur les comptes administrateurs passent toujours par Cloud Functions. Les indexes sont dans `firestore.indexes.json`.

Au premier déploiement des fonctions, Firebase demande `ENFORCE_APP_CHECK`. Gardez `false` jusqu'à ce que reCAPTCHA Enterprise soit configuré et vérifié. Passez ensuite la valeur à `true` dans le fichier d'environnement Functions généré (ou au déploiement suivant), puis redéployez. La valeur par défaut reste `false` pour permettre l'Emulator Suite sans App Check.

## 5. Créer Hani, premier Super Admin

Le script utilise Firebase Admin avec Application Default Credentials. Il ne stocke jamais le mot de passe.

```bash
gcloud auth application-default login
export FIREBASE_PROJECT_ID="salle-loay-gestion-2026"
export SUPER_ADMIN_NAME="Hani"
export SUPER_ADMIN_USERNAME="hani"
export SUPER_ADMIN_PASSWORD='choisissez-un-mot-de-passe-fort'
npm run create-super-admin
unset SUPER_ADMIN_PASSWORD
```

Alternative CI : définissez `GOOGLE_APPLICATION_CREDENTIALS` vers un fichier de compte de service conservé hors du dépôt. Le compte créé utilise en interne `hani@auth.salle-loay.local`, mais Hani saisit uniquement `hani`.

Le script : crée/met à jour l'utilisateur Auth, applique le claim `role=super_admin`, puis écrit `users/{uid}` et la réservation interne du nom d'utilisateur. Il n'écrit jamais le mot de passe dans Firestore.

## 6. Développement local

Avec un vrai projet Firebase :

```bash
npm run dev
```

Ouvrez `http://localhost:3000`. Pour le développement intégral avec émulateurs, mettez `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`, puis utilisez deux terminaux :

```bash
npm run emulators
npm run dev
```

L'Emulator UI est disponible sur `http://localhost:4000`.

## 7. Validation

```bash
npm test
npm run lint
npm run typecheck
npm run build
cd functions && npm run build
```

Les tests automatisés couvrent notamment le formatage DZD, la stabilité des dates calendaires, la validation de l'avance et le champ Ménage monétaire. Les workflows Auth/Firestore/Functions doivent aussi être validés sur Emulator Suite avant chaque mise en production.

## 8. Déploiement Firebase Hosting

Le projet utilise l'intégration Firebase Web Frameworks pour déployer Next.js avec les routes dynamiques :

```bash
firebase deploy
```

La première exécution peut demander l'activation des API Google Cloud et crée le backend serveur nécessaire. Après déploiement, ajoutez l'URL `web.app` aux domaines autorisés d'Authentication et configurez App Check pour ce domaine.

## 9. Installer la PWA depuis Chrome

1. Ouvrez l'URL Firebase Hosting en HTTPS dans Chrome.
2. Connectez-vous.
3. Cliquez sur l'icône **Installer** dans la barre d'adresse, ou **⋮ → Installer Salle Louay**.
4. L'application s'ouvre ensuite en mode autonome.

Le service worker met uniquement en cache le shell et les ressources statiques. Les créations/modifications/suppressions restent désactivées hors connexion afin d'éviter les conflits de réservation.

## Sécurité et modèle de données

- `reservations/{YYYY-MM-DD}` : l'identifiant garantit une seule réservation par date.
- `users/{uid}` : profil sans mot de passe.
- `usernames/{usernameLower}` : réservation privée d'un nom normalisé.
- `auditLogs/{id}` : journal visible uniquement par Super Admin.
- Les timestamps sont générés côté serveur ; les dates de réservation restent des chaînes `YYYY-MM-DD` dans le fuseau métier `Africa/Algiers`.
- Les changements de date et créations simultanées sont arbitrés dans des transactions Firestore atomiques.

## Actions manuelles restantes avant production

- Choisir l'identifiant et la région définitifs du projet Firebase.
- Activer Email/Password, Firestore, Blaze/Functions et App Check dans la Console.
- Copier la configuration Web dans `.env.local`.
- Déployer règles, indexes et fonctions.
- Créer Hani avec une phrase secrète choisie par le propriétaire.
- Tester avec deux comptes et deux appareils, puis activer l'enforcement App Check.
