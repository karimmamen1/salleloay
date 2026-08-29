# Salle des Fêtes Louay — Gestion des Réservations

Application interne bilingue (français/arabe RTL) pour gérer les réservations de **Salle des Fêtes Louay / قاعة الأفراح لؤي**. Elle utilise Next.js, TypeScript, Vercel et PostgreSQL via Neon.

## Fonctionnalités

- Connexion sécurisée par nom d'utilisateur et mot de passe.
- Rôles `super_admin` et `admin`, comptes actifs ou désactivés.
- Calendrier mensuel : vert = disponible, rouge = réservé, une seule réservation par date.
- Création et édition transactionnelles ; déplacement de date et suppression réservés au Super Admin.
- Personnel et services : cuisinier, DJ interne/externe, serveurs et nombre d'agents de ménage.
- Reçus PDF bilingues avec talon détachable et rapport mensuel PDF réservé au Super Admin.
- Gestion sécurisée des administrateurs, réinitialisation de mot de passe et journal d'audit.
- Interface française/arabe RTL, responsive et installable comme PWA.

## Installation locale

Prérequis : Node.js 22 LTS, npm et une base PostgreSQL Neon.

```bash
npm install
cp .env.local.example .env.local
```

Placez la chaîne de connexion PostgreSQL poolée dans `.env.local` :

```dotenv
DATABASE_URL=postgresql://...
```

Initialisez ensuite la base, créez le premier Super Admin et lancez l'application :

```bash
npm run db:migrate
SUPER_ADMIN_NAME="Hani" \
SUPER_ADMIN_USERNAME="hani" \
SUPER_ADMIN_PASSWORD='une-phrase-secrete-forte' \
npm run create-super-admin
npm run dev
```

Le mot de passe doit contenir au moins 12 caractères, avec majuscule, minuscule, chiffre et symbole. Il est haché avec bcrypt et n'est jamais stocké en clair.

## Déploiement Vercel + Neon

1. Importez ce dépôt GitHub dans Vercel.
2. Dans le projet Vercel, ouvrez **Storage / Marketplace** et installez l'intégration **Neon Postgres**.
3. Liez la base au projet afin que `DATABASE_URL` soit injectée dans Development, Preview et Production.
4. Récupérez les variables localement avec `vercel env pull .env.local`.
5. Exécutez `npm run db:migrate`, puis `npm run create-super-admin`.
6. Déployez avec `vercel --prod` ou laissez l'intégration GitHub construire automatiquement `main`.

Les migrations sont idempotentes : `npm run db:migrate` peut être relancé sans effacer les données.

### Migration des champs de réservation

La migration ajoute `dj_name`, `dj_type` et `cleaning_count`. Les anciens montants `cook_cost` et `cleaning_cost` sont copiés dans `reservation_legacy_service_costs` avant la suppression des colonnes. `cleaning_count` est initialisé à `0` pour les anciens dossiers : un ancien prix de ménage n'est jamais interprété comme un nombre d'agents.

```bash
npm run db:migrate
# ou, pour exécuter uniquement cette migration :
npm run db:migrate-reservations
```

Après la migration, vérifiez manuellement le DJ et le nombre d'agents de ménage des réservations historiques.

## Validation

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Pour générer les deux PDF de contrôle locaux (reçu et rapport mensuel) dans `tmp/pdfs/` :

```bash
npm run pdf:samples
```

## Sécurité et modèle de données

- Les sessions utilisent un cookie `HttpOnly`, `SameSite=Lax` et `Secure` en production ; seul le SHA-256 du jeton est conservé en base.
- Les mots de passe sont hachés avec bcrypt (coût 12).
- Les mutations vérifient l'origine de la requête et le rôle côté serveur.
- Les tentatives de connexion sont limitées par nom d'utilisateur et adresse IP.
- `reservations.reservation_date` est la clé primaire, ce qui garantit une seule réservation par jour.
- Les créations, modifications et suppressions sensibles produisent une entrée dans `audit_logs`.

## Migration depuis Firebase

Les mots de passe Firebase ne sont pas exportables en clair : recréez Hani avec la commande ci-dessus et réinitialisez les mots de passe des autres administrateurs. Les anciennes données Firestore doivent être exportées puis importées séparément avant de désactiver Firebase ; ne supprimez pas l'ancien projet avant d'avoir vérifié les réservations dans PostgreSQL.
