# Rapport d'analyse — signal-sdk vs signal-cli

**Date d'analyse :** 2026-03-12
**Version SDK actuelle :** 0.1.7
**Version signal-cli ciblée (install.js) :** 0.14.0
**Dernière version signal-cli disponible :** **v0.14.1** (2026-03-08)

---

## 1. Résumé exécutif

Le SDK couvre bien les fonctionnalités de la v0.14.0. L'intégration JSON-RPC est correcte dans l'ensemble.
Toutefois, **20 problèmes ont été identifiés** — de bugs bloquants à des améliorations mineures — dont **3 bugs critiques** qui entraînent un comportement incorrect silencieux.

---

## 2. Bugs critiques (comportement incorrect / silencieusement cassé)

### 🔴 BUG-01 — `updateProfile()` envoie un mauvais paramètre
**Fichier :** `src/managers/AccountManager.ts:28`
**Problème :** La méthode envoie `params.name = name` mais signal-cli JSON-RPC ne reconnaît **aucun** champ `name` pour `updateProfile`. Les paramètres acceptés sont `givenName` et `familyName`. La mise à jour du profil est donc silencieusement ignorée par signal-cli.
**Signal-cli attendu :** `{ givenName: "...", familyName: "..." }`
**SDK actuel :** `{ name: "..." }` ← non reconnu

**Fix :** Renommer `params.name` en `params.givenName` et exposer `familyName` en paramètre principal.

---

### 🔴 BUG-02 — `ReceiveOptions` déclarée deux fois dans `interfaces.ts`
**Fichier :** `src/interfaces.ts` lignes 679–690 et 1257–1272
**Problème :** L'interface `ReceiveOptions` est exportée **deux fois** dans le même fichier. TypeScript fusionne les déclarations (declaration merging), ce qui masque l'erreur à la compilation mais crée une interface incohérente :
- La première déclaration (l. 679) contient `since?: number` (non supporté par signal-cli)
- La seconde (l. 1257) n'a pas ce champ mais est identique par ailleurs

**Fix :** Fusionner les deux en une seule déclaration propre, supprimer `since` (non supporté côté signal-cli).

---

### 🔴 BUG-03 — Reconnexion perd les options JSON-RPC
**Fichier :** `src/SignalCli.ts:548`
**Problème :** Lors de la reconnexion automatique (`handleProcessClose`), `this.connect()` est appelé **sans arguments**, effaçant tous les flags passés à l'origine (`ignoreAttachments`, `ignoreAvatars`, `ignoreStickers`, `receiveMode`, etc.). La session reconnectée n'a plus les mêmes paramètres que la session initiale.

**Fix :** Appeler `this.connect(this.jsonRpcStartOptions)` au lieu de `this.connect()`.

---

## 3. Problèmes importants (comportement dégradé / cohérence CLI)

### 🟠 PROB-04 — `trustIdentity()` envoie des paramètres incorrects
**Fichier :** `src/managers/ContactManager.ts:93`
**Problème :** La méthode envoie `{ safetyNumber, verified }` mais signal-cli attend soit `verifiedSafetyNumber` (camelCase du flag `--verified-safety-number`), soit `trustAllKnownKeys`. Il n'existe **pas de flag `--verified`** dans signal-cli. Le résultat est un appel JSON-RPC qui ne fait probablement rien côté signal-cli.
**Signal-cli attendu :**
```json
{ "recipient": "+33...", "verifiedSafetyNumber": "12345..." }
```
**SDK actuel :**
```json
{ "recipient": "+33...", "safetyNumber": "12345...", "verified": true }
```

**Fix :** Remplacer `safetyNumber` par `verifiedSafetyNumber`, supprimer `verified`.

---

### 🟠 PROB-05 — Double QR code pour `link` avec signal-cli v0.14.0+
**Fichier :** `src/managers/DeviceManager.ts:72-77`
**Problème :** Depuis v0.14.0, signal-cli affiche **lui-même** un QR code dans le terminal lors de la commande `link`. Si `options.qrCodeOutput === 'console'`, le SDK génère un second QR code via `qrcode-terminal`. L'utilisateur voit le QR code affiché en double.
De plus, le QR code ASCII de signal-cli dans stdout peut perturber la détection du pattern `sgnl://` dans le parsing.

**Fix :** Détecter si signal-cli a déjà affiché son propre QR code et ne pas générer un doublon SDK-side. Ou passer un flag pour désactiver l'affichage signal-cli.

---

### 🟠 PROB-06 — `listContacts()` n'accepte pas d'options
**Fichier :** `src/managers/ContactManager.ts:43-48`
**Problème :** L'interface `ListContactsOptions` est définie dans `interfaces.ts` mais la méthode `listContacts()` **ne l'utilise pas**. Il est donc impossible de passer `--detailed`, `--blocked`, `--all-recipients`, `--name` au niveau JSON-RPC.

**Fix :** Modifier la signature en `listContacts(options: ListContactsOptions = {}): Promise<Contact[]>` et construire les params correspondants.

---

### 🟠 PROB-07 — `parseEnvelope` ne gère pas les text attachments (v0.14.0)
**Fichier :** `src/managers/MessageManager.ts:236`
**Problème :** Depuis v0.14.0, signal-cli envoie les **longs messages** comme text attachments au lieu d'un body tronqué. La méthode `parseEnvelope` lit `data.message || data.body` mais **ignore `data.textAttachment`**. Les longs messages reçus apparaîtront vides côté SDK.

**Fix :** Ajouter la gestion de `data.textAttachment` :
```typescript
message.text = data.message || data.body || data.textAttachment?.text;
```

---

### 🟠 PROB-08 — `AccountConfiguration` contient des champs non supportés
**Fichier :** `src/interfaces.ts:617-626`
**Problème :** L'interface `AccountConfiguration` expose `keepMutedChatsArchived` et `universalExpireTimer` mais le command `updateConfiguration` de signal-cli ne supporte que : `readReceipts`, `unidentifiedDeliveryIndicators`, `typingIndicators`, `linkPreviews`.
Ces champs non-reconnus sont envoyés silencieusement au JSON-RPC sans effet.

**Fix :** Supprimer `keepMutedChatsArchived` et `universalExpireTimer` de `AccountConfiguration`, ou les documenter clairement comme non-supportés.

---

## 4. Fonctionnalités manquantes à implémenter

### 🟡 FEAT-09 — `isArchived` manquant dans `GroupInfo` (v0.14.1)
**Fichier :** `src/interfaces.ts`
**Problème :** signal-cli v0.14.1 expose `isArchived` dans le JSON de sortie des chats/groupes. Ce champ n'est pas présent dans l'interface `GroupInfo` (il existe dans `Group` mais pas dans `GroupInfo`).
L'interface `Contact` a `archived?: boolean` mais devrait aussi avoir `isArchived?: boolean` pour la cohérence avec le JSON retourné.

**Fix :** Ajouter `isArchived?: boolean` à `GroupInfo` et vérifier/aligner `Contact`.

---

### 🟡 FEAT-10 — `quitGroup()` ne supporte pas le flag `--delete`
**Fichier :** `src/managers/GroupManager.ts:41`
**Problème :** signal-cli `quitGroup` supporte `--delete` pour effacer les données locales du groupe en même temps que le quit. Le SDK n'expose pas ce flag.

**Fix :** Ajouter `options?: { delete?: boolean }` à `quitGroup()`.

---

### 🟡 FEAT-11 — Événements `pin`/`unpin` non émis dans `emitDetailedEvents`
**Fichier :** `src/SignalCli.ts:479`
**Problème :** Les événements de type `pinnedMessage` / `unpinnedMessage` dans les envelopes (nouveaux en v0.14.0) ne sont pas gérés dans `emitDetailedEvents()`. Les applications qui écoutent les événements ne peuvent pas réagir aux pin/unpin.

**Fix :** Ajouter dans `emitDetailedEvents` :
```typescript
if (envelope.dataMessage?.pinnedMessageTimestamps !== undefined) {
    this.emit('pin', { sender: source, timestamp, ...envelope.dataMessage });
}
```

---

### 🟡 FEAT-12 — `register()` ne supporte pas `--reregister`
**Fichier :** `src/managers/AccountManager.ts:13`
**Problème :** signal-cli `register` supporte le flag `--reregister` pour forcer la ré-enregistrement d'un numéro déjà enregistré. Non exposé dans le SDK.

**Fix :** Ajouter `reregister?: boolean` aux paramètres de `register()`.

---

### 🟡 FEAT-13 — `StoryOptions` interface orpheline (aucune méthode `sendStory`)
**Fichier :** `src/interfaces.ts:1149`
**Problème :** L'interface `StoryOptions` est définie mais aucune méthode `sendStory()` n'est implémentée dans le SDK. Interface morte.

**Fix :** Soit implémenter `sendStory()`, soit supprimer l'interface et la garder en backlog.

---

## 5. Incohérences mineures et nettoyage

### 🔵 MINOR-14 — Script `install.js` cible v0.14.0 au lieu de v0.14.1
**Fichier :** `scripts/install.js:6`
**Fix :** `const VERSION = '0.14.1';`

---

### 🔵 MINOR-15 — Mention Java 17+ à corriger (Java 25 requis depuis v0.14.0)
**Fichiers :** `scripts/install.js:247`, `README.md`, toute la documentation
**Fix :** Remplacer toutes les occurrences de "JDK 17+" par "Java 25+".

---

### 🔵 MINOR-16 — `ReceiveOptions.since` non supporté par signal-cli
**Fichier :** `src/interfaces.ts:685` (première déclaration)
**Problème :** Le champ `since?: number` n'a aucun équivalent dans les flags de `receive` de signal-cli. Il est envoyé inutilement au JSON-RPC.
**Fix :** Supprimer `since` lors de la consolidation des deux `ReceiveOptions` (voir BUG-02).

---

### 🔵 MINOR-17 — Deux interfaces de groupe (`GroupInfo` et `Group`) incohérentes
**Fichier :** `src/interfaces.ts:315-490`
**Problème :** `GroupInfo` utilise `Address[]` pour les membres/admins. `Group` utilise `string[]`. Ces deux interfaces représentent le même objet retourné par signal-cli mais avec des types différents. Cela oblige les développeurs à naviguer entre les deux selon la méthode utilisée.
**Fix :** Consolider en une seule interface `GroupInfo` avec `string[]` pour les membres, supprimer `Address[]` (l'interface `Address` est déjà marquée `@deprecated`).

---

### 🔵 MINOR-18 — `--service-environment sandbox` est déprécié (v0.14.0)
**Impact :** Aucun dans le code actuel du SDK (le flag n'est pas exposé), mais si des scripts utilisateurs ou la doc en font mention, remplacer `sandbox` par `staging`.

---

### 🔵 MINOR-19 — `sendMessageWithProgress` simule une progression fictive
**Fichier :** `src/managers/MessageManager.ts:386-394`
**Problème :** La callback `onProgress` reçoit une progression artificielle (0→100 par paliers de 10, toutes les 50ms) avant même que l'envoi soit effectué. Ce n'est pas la vraie progression d'upload.
**Fix :** Documenter clairement la limitation ou implémenter un vrai suivi (non trivial avec JSON-RPC).

---

### 🔵 MINOR-20 — `daemon` command : breaking change non documenté
**Impact :** Le SDK utilise `jsonRpc` (pas `daemon`), donc pas de régression fonctionnelle. Mais la documentation qui mentionne la commande `daemon` doit être mise à jour : depuis v0.14.0 elle nécessite au moins un paramètre de canal (`--socket`, `--dbus`, etc.).

---

## 6. TODO List détaillée — Upgrade SDK

### Priorité 1 — Bugs bloquants (à corriger immédiatement)

- [ ] **[BUG-01]** `AccountManager.updateProfile()` : remplacer `params.name` par `params.givenName`, ajouter `params.familyName` comme paramètre direct
- [ ] **[BUG-02]** `interfaces.ts` : fusionner les deux déclarations de `ReceiveOptions` en une seule, supprimer `since?: number`
- [ ] **[BUG-03]** `SignalCli.ts:548` : corriger l'auto-reconnexion pour passer `this.jsonRpcStartOptions` à `this.connect()`
- [ ] **[PROB-04]** `ContactManager.trustIdentity()` : remplacer `{ safetyNumber, verified }` par `{ verifiedSafetyNumber }` dans les params JSON-RPC

### Priorité 2 — Mise à jour version (v0.14.1)

- [ ] **[MINOR-14]** `scripts/install.js` : bumper `VERSION` de `'0.14.0'` à `'0.14.1'`
- [ ] **[MINOR-15]** Mettre à jour toutes les mentions "JDK 17+" → "Java 25+" dans `install.js`, `README.md`, et la documentation
- [ ] **[FEAT-09]** `interfaces.ts` : ajouter `isArchived?: boolean` à l'interface `GroupInfo`
- [ ] Bumper la version du SDK : `package.json` `"version"` → `0.1.8` ou `0.2.0`
- [ ] Mettre à jour `CHANGELOG.md` avec les changements v0.14.1 et les corrections

### Priorité 3 — Corrections comportementales importantes

- [ ] **[PROB-05]** `DeviceManager.deviceLink()` : gérer la coexistence avec le QR code natif de signal-cli v0.14.0+, éviter le double affichage
- [ ] **[PROB-06]** `ContactManager.listContacts()` : accepter `ListContactsOptions` et construire les params (`detailed`, `blocked`, `allRecipients`, `name`, `recipients`)
- [ ] **[PROB-07]** `MessageManager.parseEnvelope()` : ajouter la lecture de `data.textAttachment?.text` pour les longs messages (v0.14.0)
- [ ] **[PROB-08]** `interfaces.ts` : supprimer `keepMutedChatsArchived` et `universalExpireTimer` de `AccountConfiguration`, ou les marquer clairement comme non supportés

### Priorité 4 — Nouvelles fonctionnalités à ajouter

- [ ] **[FEAT-10]** `GroupManager.quitGroup()` : ajouter le paramètre `options?: { delete?: boolean }`
- [ ] **[FEAT-11]** `SignalCli.emitDetailedEvents()` : émettre des événements `pin`/`unpin` depuis les envelopes correspondants
- [ ] **[FEAT-12]** `AccountManager.register()` : ajouter le support de `reregister?: boolean`
- [ ] **[FEAT-13]** Décider du sort de `StoryOptions` : implémenter `sendStory()` ou supprimer l'interface

### Priorité 5 — Nettoyage et refactoring

- [ ] **[MINOR-16]** Retirer `since?: number` de `ReceiveOptions` (non supporté par signal-cli)
- [ ] **[MINOR-17]** Unifier `GroupInfo` et `Group` : une seule interface avec `string[]` pour les membres, déprécier puis supprimer `Group` et les usages de `Address[]` dans `GroupInfo`
- [ ] **[MINOR-18]** Documenter la dépréciation de `--service-environment sandbox` → `staging`
- [ ] **[MINOR-19]** Documenter explicitement la limitation de `sendMessageWithProgress` (progression fictive)
- [ ] **[MINOR-20]** Mettre à jour la documentation relative à la commande `daemon` (nécessite un canal explicite depuis v0.14.0)
- [ ] Ajouter des tests unitaires pour couvrir :
  - Le comportement de `parseEnvelope` avec `textAttachment`
  - La reconnexion avec préservation des options
  - `trustIdentity` avec le bon nom de paramètre
  - `listContacts` avec options

---

## 7. Tableau de synthèse

| ID | Sévérité | Fichier principal | Description courte |
|----|----------|-------------------|--------------------|
| BUG-01 | 🔴 Critique | `AccountManager.ts` | `updateProfile` envoie `name` au lieu de `givenName` |
| BUG-02 | 🔴 Critique | `interfaces.ts` | `ReceiveOptions` déclarée deux fois |
| BUG-03 | 🔴 Critique | `SignalCli.ts` | Reconnexion perd les options JSON-RPC |
| PROB-04 | 🟠 Important | `ContactManager.ts` | `trustIdentity` mauvais noms de params |
| PROB-05 | 🟠 Important | `DeviceManager.ts` | Double QR code avec signal-cli v0.14.0+ |
| PROB-06 | 🟠 Important | `ContactManager.ts` | `listContacts` n'accepte pas d'options |
| PROB-07 | 🟠 Important | `MessageManager.ts` | `parseEnvelope` ignore `textAttachment` |
| PROB-08 | 🟠 Important | `interfaces.ts` | `AccountConfiguration` a des champs non supportés |
| FEAT-09 | 🟡 Manquant | `interfaces.ts` | `isArchived` absent de `GroupInfo` (v0.14.1) |
| FEAT-10 | 🟡 Manquant | `GroupManager.ts` | `quitGroup` sans flag `--delete` |
| FEAT-11 | 🟡 Manquant | `SignalCli.ts` | Événements pin/unpin non émis |
| FEAT-12 | 🟡 Manquant | `AccountManager.ts` | `register` sans `--reregister` |
| FEAT-13 | 🟡 Manquant | `interfaces.ts` | `StoryOptions` orpheline, `sendStory` absent |
| MINOR-14 | 🔵 Mineur | `install.js` | Version cible 0.14.0 → 0.14.1 |
| MINOR-15 | 🔵 Mineur | install.js + docs | Java 17+ → Java 25+ |
| MINOR-16 | 🔵 Mineur | `interfaces.ts` | `since` non supporté dans `ReceiveOptions` |
| MINOR-17 | 🔵 Mineur | `interfaces.ts` | Deux interfaces groupe incohérentes |
| MINOR-18 | 🔵 Mineur | docs | `sandbox` → `staging` déprécié |
| MINOR-19 | 🔵 Mineur | `MessageManager.ts` | Progression fictive non documentée |
| MINOR-20 | 🔵 Mineur | docs | `daemon` nécessite un canal explicite depuis v0.14.0 |

---

*Rapport généré le 2026-03-12 — Signal SDK v0.1.7 vs signal-cli v0.14.1*
