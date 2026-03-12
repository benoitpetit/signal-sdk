# Rapport d'incohérences signal-sdk vs signal-cli v0.14.1

**Date d'analyse:** 2026-03-12  
**signal-cli version:** 0.14.1  
**SDK version:** 0.1.8

---

## 🔴 Incohérences majeures détectées

### 1. `receiveMode` - Valeur manquante
**Fichier:** `src/interfaces.ts` (JsonRpcStartOptions)

| CLI | SDK | Statut |
|-----|-----|--------|
| `on-start` | `on-start` | ✅ |
| `on-connection` | ❌ MANQUANT | 🔴 |
| `manual` | `manual` | ✅ |

**Fix:** Ajouter `'on-connection'` à l'union type de `receiveMode`

---

### 2. `trust` - Option manquante
**Fichier:** `src/managers/ContactManager.ts`, `src/interfaces.ts`

signal-cli supporte:
- `-a, --trust-all-known-keys` - Trust all known keys of this user
- `-v VERIFIED_SAFETY_NUMBER` - Trust a specific safety number

Le SDK ne supporte que le deuxième cas.

**Fix:** Ajouter une méthode `trustAllKnownKeys(number: string)` ou un paramètre optionnel

---

### 3. `quitGroup` - Option manquante
**Fichier:** `src/managers/GroupManager.ts`

signal-cli v0.14.1 supporte:
```
--admin [ADMIN [ADMIN ...]]  # Specify members to make admin before quitting
```

Cette option est **requise** si l'utilisateur est actuellement le seul admin.

**Fix:** Ajouter `admins?: string[]` aux options de `quitGroup()`

---

### 4. `updateGroup` - Options manquantes
**Fichier:** `src/interfaces.ts` (GroupUpdateOptions)

| Option CLI | SDK | Description |
|------------|-----|-------------|
| `--member-label-emoji` | ❌ | Emoji pour le label des membres |
| `--member-label` | ❌ | Label des membres |
| `--link {enabled,enabled-with-approval,disabled}` | ❌ | État du lien de groupe |

Le SDK a seulement `resetInviteLink: boolean` mais pas la gestion complète du lien.

---

### 5. `PinMessageOptions` - Option manquante
**Fichier:** `src/interfaces.ts`

signal-cli supporte `--story` pour épingler/désépingler une story.

**Fix:** Ajouter `story?: boolean` à `PinMessageOptions`

---

## 🟡 Incohérences mineures

### 6. Support des usernames dans les envois
Plusieurs commandes signal-cli supportent `--username` pour envoyer à un username au lieu d'un numéro:
- `send`
- `sendReaction`
- `sendPinMessage`
- `sendUnpinMessage`
- `sendPollCreate`
- `sendPollVote`
- `getUserStatus` (déjà supporté)

Le SDK utilise principalement les numéros de téléphone. L'ajout du support usernames serait une amélioration.

---

### 7. Options `notifySelf` manquantes
Plusieurs commandes supportent `--notify-self`:
- `sendPinMessage` (déjà supporté)
- `sendUnpinMessage` (déjà supporté)  
- `sendAdminDelete` (déjà supporté)
- `send`, `sendReaction`, etc. (non supporté)

---

## ✅ Commandes correctement mappées

Les commandes suivantes sont **correctement implémentées** avec tous leurs paramètres:

- ✅ `register` (avec `--reregister`)
- ✅ `verify`
- ✅ `updateProfile` (avec `givenName`/`familyName`)
- ✅ `updateConfiguration` (champs limités correctement)
- ✅ `updateAccount` (avec `unrestrictedUnidentifiedSender`)
- ✅ `listContacts` (avec toutes les options)
- ✅ `trust` (vérification du safety number)
- ✅ `send` (tous les paramètres principaux)
- ✅ `receive` / `jsonRpc` (toutes les options de filtrage)
- ✅ `sendReaction`, `sendReceipt`, `sendTyping`
- ✅ `createGroup`, `updateGroup` (fonctionnalités principales)
- ✅ `sendPollCreate`, `sendPollVote`, `sendPollTerminate`
- ✅ `sendPaymentNotification`
- ✅ `startChangeNumber`, `finishChangeNumber`
- ✅ `submitRateLimitChallenge`

---

## 📋 Résumé des priorités

| Priorité | Élément | Impact |
|----------|---------|--------|
| 🔴 Haute | `receiveMode: 'on-connection'` | Fonctionnalité manquante |
| 🔴 Haute | `quitGroup` option `admin` | Bloquant si utilisateur = seul admin |
| 🟡 Moyenne | `trustAllKnownKeys` | Fonctionnalité de test utile |
| 🟡 Moyenne | `updateGroup` options avancées | Fonctionnalités de groupe |
| 🟢 Basse | Support usernames global | Amélioration UX |

---

## 🔧 Recommandations

1. **Immédiat:** Corriger `receiveMode` pour inclure `'on-connection'`
2. **Court terme:** Ajouter l'option `admin` à `quitGroup()`
3. **Moyen terme:** Ajouter `trustAllKnownKeys` et les options de groupe avancées
4. **Long terme:** Évaluer le support complet des usernames comme identifiants alternatifs aux numéros
