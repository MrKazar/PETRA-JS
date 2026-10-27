# PETRA (version JavaScript)

Appli de suivi sportif en français : programmes, séances en direct avec minuteur de repos, planning de la semaine, routines quotidiennes, finishers et records personnels. Réécriture de l'appli Kotlin [PETRA](https://github.com/MrKazar/PETRA) en React + TypeScript, emballée pour Android avec [Capacitor](https://capacitorjs.com).

## Installer sur le téléphone

1. Ouvre la page **Releases** du dépôt sur le téléphone.
2. Télécharge `PETRA-x.y.z.apk` et ouvre-le (autorise l'installation depuis le navigateur si Android le demande).
3. L'appli peut vérifier les mises à jour dans **Profil > Application**.

L'identifiant `fr.mrkazar.petra` est différent de l'appli Kotlin : les deux peuvent cohabiter.

## Fonctionnalités

Cinq pages, avec le design de l'appli Kotlin (emblème, logo, fond topographique, olive et kaki, liseré tricolore) :

- **Aujourd'hui** : séance prévue (avec la semaine A ou B), progression et tâches du jour (fait / reporté / sauté), bilan de la semaine, dernière séance.
- **Programmes** : planning avec alternance semaine A / semaine B (ou une seule semaine type), modifications ponctuelles sur 14 jours, liste des programmes. Dans un programme, on indique la **charge de travail** de chaque exercice et les autres charges en découlent.
- **Exercices** : catalogue de 260 exercices. Chaque exercice de musculation suit le cycle 1 série de chauffe, 2 séries de travail, 1 série d'hypertrophie, avec répétitions, pourcentages de charge et temps de repos préconisés selon le type d'exercice (voir `scripts/build_catalog.py`).
- **Finishers** : activation, liste des 19 finishers, tirage au sort. En fin de séance, on choisit le type et le finisher est tiré au hasard, jamais le même que la fois précédente.
- **Paramètres** : prénom, repos, vibration, écran allumé, sauvegarde / restauration, mises à jour, accès à l'historique, aux records et aux routines.

La séance en cours valide les séries, lance le repos préconisé après chaque série (notification à la fin, même appli fermée) et enregistre l'historique.

## Développer

```bash
npm install
npm run dev        # appli dans le navigateur
npm test           # tests de la logique
npm run android:sync && npx cap open android   # ouvrir dans Android Studio
```

Chaque push sur `main` lance le workflow **APK Android** : tests, construction de l'APK et publication d'une release `v<version>` (la version vient de `package.json`). Pour sortir une nouvelle version, augmente `version` dans `package.json`.

## Signature

Pour que chaque nouvel APK s'installe par-dessus le précédent, il faut toujours la même clé. Ajoute dans **Settings > Secrets and variables > Actions** du dépôt :

- `PETRA_KEYSTORE_BASE64` : le fichier keystore encodé en base64 (alias `petra`)
- `PETRA_KEYSTORE_PASSWORD` : son mot de passe

Sans ces secrets, l'APK est signé avec une clé de debug temporaire : il s'installe, mais il faut désinstaller l'ancienne version avant chaque mise à jour (ce qui efface les données, pense à la sauvegarde).

## Catalogue d'exercices

`src/data/exercices.json` est généré par `python3 scripts/build_catalog.py` : ajoute un exercice dans la liste `NEW` du script avec son profil (`poly_lourd`, `poly`, `poly_guide`, `iso`, `iso_petit`, `pdc`, `abdos`, `gainage`…), puis relance-le.
