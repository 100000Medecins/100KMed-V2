Synchronisation Git rapide entre laptop et desktop. Usage : /sync.

PAS de mise à jour CHANGELOG, PAS de mise à jour TODO. C'est juste de la plomberie Git rapide quand tu veux passer d'une machine à l'autre sans clôturer formellement la session. Pour une vraie clôture avec doc, utilise `/end`.

## Étape 1 — État Git

Lance `git status` et `git fetch origin`.

Identifie :
- La branche active
- S'il y a des modifications locales non commitées
- S'il y a des commits locaux non pushés
- Si `origin/<branche>` a avancé pendant que tu travaillais

## Étape 2 — Trois scénarios

### Scénario A — Working tree clean, branche à jour avec origin

Affiche : "✅ Tout est synchronisé."

C'est terminé.

### Scénario B — Working tree clean, mais commits locaux non pushés

Lance `git push origin <branche>`.

Confirme : "✅ X commits poussés sur `origin/<branche>`. L'autre machine pourra les récupérer avec un `git pull` (ou `/start`)."

### Scénario C — Modifications locales en cours

Demande à l'utilisateur ce qu'il veut faire :

> "Tu as N fichiers modifiés. Comment tu veux gérer ?
>
> 1. **Commit WIP rapide** : je commite tout avec `wip: synchro [YYYY-MM-DD HH:MM]` et je push. Tu pourras squash le commit plus tard avec `/end`.
> 2. **Stash** : modifs gardées localement, ne partent pas sur l'autre machine.
> 3. **Annuler** : tu finis ce que tu fais, on relancera `/sync` plus tard.
> 4. **Commit propre maintenant** : on prend 30 secondes pour faire un vrai commit avec un bon message (sans CHANGELOG, sans TODO — juste le commit + push)."

Selon le choix :

#### Option 1 — Commit WIP

```
git add -A
git commit -m "wip: synchro inter-machines YYYY-MM-DD HH:MM"
git push origin <branche>
```

Confirme et rappelle : "Pense à utiliser `/end` à la vraie fin de session pour faire un commit propre + CHANGELOG + TODO."

#### Option 2 — Stash

```
git stash push -m "sync-YYYY-MM-DD HH:MM"
```

Confirme : "Modifications mises de côté. Tu pourras les reprendre avec `git stash pop` quand tu reviendras sur cette machine."

#### Option 3 — Annuler

Ne fais rien. Dis : "Pas de problème, à plus tard."

#### Option 4 — Commit propre

Demande un message de commit, lance :

```
git add -A
git commit -m "<message fourni>"
git push origin <branche>
```

## Étape 3 — Pull si nécessaire

Si pendant le `git fetch` initial, tu as détecté que `origin/<branche>` a avancé pendant que tu travaillais :

### Si working tree clean (après les actions de l'étape 2)

Lance `git pull --ff-only`. Si ça passe, dis : "✅ Modifs distantes récupérées."

### Si working tree pas clean (l'utilisateur a annulé à l'étape 2)

NE PULL PAS. Affiche : "⚠️ La branche distante a avancé. Tu devras `git pull` (avec rebase ou merge) avant de continuer ton travail."

## Règles importantes

- **Tout doit être rapide** : pas plus de 30-60 secondes d'interaction. Sinon autant utiliser `/end`.
- **Pas de modification du CHANGELOG ni du TODO** dans `/sync` — c'est explicite.
- **Pas de force-push**, jamais.
- **Si l'utilisateur est sur `main`** : prudence accrue, demande confirmation avant tout push.
- **Toujours en français**, ton conversationnel et bref.
- **Pas de tableaux Markdown**.
