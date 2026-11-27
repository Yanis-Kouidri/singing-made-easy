# Singing Made Easy

Une app web pour apprendre à chanter juste. Elle joue une note, écoute ta voix au micro et te montre en temps réel si tu es trop haut, trop bas ou juste.

**👉 Essayer : https://yanis-kouidri.github.io/singing-made-easy/**

## Fonctionnalités

- **Exercice « tenir une note »** : l'app joue la note, tu la chantes et la tiens quelques secondes dans la zone de justesse.
- **Retour en direct** : courbe de ta voix face à la note cible, écart en cents (100 cents = 1 demi-ton) et indication du sens dans lequel corriger.
- **Catégories de voix** (de basse à soprano) et **test de tessiture** pour travailler dans une zone confortable.
- **Progression du grave vers l'aigu**, choix manuel de la note ou note au hasard.
- **Tolérance réglable** (±50, ±25 ou ±10 cents) et durée à tenir.

Tout se passe dans le navigateur : aucun son n'est enregistré ni envoyé sur Internet.

## Conseils d'utilisation

- Utilise un navigateur récent (Chrome, Edge, Firefox ou Safari) et autorise l'accès au micro.
- Un casque est conseillé, pour que le micro n'entende pas la note de référence.
- Les notes de référence suivent le standard La = 440 Hz.

## Développement

Prérequis : Node 24 (voir `.node-version`).

```bash
npm install
npm run dev      # serveur de développement sur http://localhost:5173
npm run build    # build de production dans dist/
npm run preview  # sert le build localement
```

Stack : [Vite](https://vite.dev) + TypeScript, sans framework. La détection de hauteur utilise [pitchy](https://github.com/ianprime0509/pitchy) (algorithme McLeod).

## Déploiement

Chaque push sur `main` lance le workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), qui builde l'app et la publie sur GitHub Pages.
