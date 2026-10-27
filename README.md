# PETRA (version JavaScript)

Appli de suivi sportif en français : programmes, séances en direct avec minuteur de repos, planning de la semaine, routines quotidiennes, finishers et records personnels. Réécriture de l'appli Kotlin [PETRA](https://github.com/MrKazar/PETRA) en React + TypeScript, emballée pour Android avec [Capacitor](https://capacitorjs.com).

## Installer sur le téléphone

1. Ouvre la page **Releases** du dépôt sur le téléphone.
2. Télécharge `PETRA-x.y.z.apk` et ouvre-le (autorise l'installation depuis le navigateur si Android le demande).
3. L'appli peut vérifier les mises à jour dans **Profil > Application**.

L'identifiant `fr.mrkazar.petra` est différent de l'appli Kotlin : les deux peuvent cohabiter.

## Fonctionnalités

- **Programmes** : catalogue de plus de 100 exercices (cycles force ou hypertrophie, séries d'échauffement, cardio en durées) ou exercices perso. Séries, répétitions, charges, durées et repos modifiables.
- **Séance en direct** : validation des séries, report automatique de la charge, minuteur de repos (+15 s, passer) qui continue en arrière-plan avec une notification à la fin, notification « séance en cours », écran maintenu allumé, séance libre, résumé de fin et historique.
- **Plan** : semaine type (un programme par jour ou repos) et modifications ponctuelles sur les 14 prochains jours. L'accueil propose la séance du jour.
- **Routines** : tâches quotidiennes, certains jours ou une fois, avec statut fait / reporté (réapparaît le lendemain) / sauté.
- **Finishers** (désactivés par défaut, Profil > Séances) : au moment de terminer, on choisit le type (Abdos, Dos, Pecs, Jambes, Épaules / bras) et un finisher est tiré au hasard, jamais le même que la fois précédente pour ce type.
- **Records** : meilleure charge et 1RM estimé par exercice.
- **Données** : tout reste sur le téléphone. Sauvegarde et restauration par copier-coller dans Profil > Données.

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

## Pas encore repris de l'appli Kotlin

- Le widget flottant par-dessus les autres applis (remplacé par la notification de séance et celle de fin de repos).
- Les mesures corporelles (poids, objectifs).
