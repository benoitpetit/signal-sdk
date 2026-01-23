# Signal SDK Examples

Exemples pratiques démontrant l'utilisation du Signal SDK et du framework SignalBot.

## 📚 Documentation Complète

**→ Consultez le [Guide des Exemples](../docs/examples-guide.md) pour:**

- Instructions détaillées pour chaque exemple
- Explication du code ligne par ligne
- Cas d'usage et meilleures pratiques
- Troubleshooting

## Structure

```
examples/
├── sdk/                           # Exemples SDK
│   ├── 00-device-linking.js       # ⚠️ OBLIGATOIRE EN PREMIER
│   ├── 01-basic-usage.js          # Utilisation basique
│   ├── 02-quick-start.js          # Démarrage rapide
│   ├── 03-group-management.js     # Gestion des groupes
│   ├── 04-contact-management.js   # Gestion des contacts
│   ├── 05-file-handling.js        # Gestion des fichiers
│   ├── 06-advanced-features.js    # Fonctionnalités avancées
│   ├── 07-cross-platform.js       # Compatibilité multiplateforme
│   ├── 08-polls.js                # Sondages
│   ├── 09-attachments.js          # Pièces jointes
│   ├── 10-account-management.js   # Gestion du compte
│   ├── 11-synchronization.js      # Synchronisation multi-appareils
│   ├── 13-multi-account.js        # Multi-comptes ✨
│   ├── 14-advanced-messaging.js   # Styles de texte, mentions ✨
│   ├── 15-identity-verification.js # Vérification d'identité ✨
│   ├── 16-username-management.js  # Gestion des pseudos ✨
│   ├── 17-enhanced-parsing.js     # Parsing enrichi ✨
│   └── 18-phone-number-change-payment.js # Changement numéro & paiements ✨
└── bot/                           # Bots SignalBot
    ├── 01-minimal-bot.js          # Bot minimal
    ├── 02-advanced-bot.js         # Bot avancé
    └── 03-advanced-bot.js         # Bot production-ready
```

## Démarrage Rapide

### 1. Prérequis

- Node.js 18+
- Java Runtime (pour signal-cli)

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install default-jre

# macOS
brew install openjdk

# Windows
# Télécharger depuis https://adoptium.net/
```

### 2. Installation

```bash
npm install signal-sdk
```

signal-cli est téléchargé automatiquement ! ✨

### 3. Configuration

```bash
# Créer .env
echo 'SIGNAL_PHONE_NUMBER="+33612345678"' > .env
```

### 4. Lier l'Appareil (OBLIGATOIRE)

```bash
node examples/sdk/00-device-linking.js
```

Scannez le QR code avec votre app Signal mobile.

### 5. Lancer un Exemple

```bash
node examples/sdk/01-basic-usage.js
```

## Exemples par Catégorie

### 🚀 Débutant

- `00-device-linking.js` - Liaison d'appareil (obligatoire)
- `01-basic-usage.js` - Envoi/réception de messages
- `02-quick-start.js` - Guide de démarrage

### 👥 Groupes & Contacts

- `03-group-management.js` - Créer/gérer des groupes
- `04-contact-management.js` - Gérer les contacts

### 📎 Fichiers & Médias

- `05-file-handling.js` - Envoyer des fichiers
- `09-attachments.js` - Récupérer des pièces jointes

### ⚡ Avancé

- `06-advanced-features.js` - Paiements, stickers
- `08-polls.js` - Créer des sondages
- `13-multi-account.js` - Gérer plusieurs comptes ✨
- `14-advanced-messaging.js` - Styles, mentions, citations ✨
- `15-identity-verification.js` - Safety numbers ✨
- `16-username-management.js` - Pseudos Signal ✨
- `17-enhanced-parsing.js` - Parsing enrichi ✨
- `18-phone-number-change-payment.js` - Changement numéro & paiements ✨

### 🤖 Bots

- `bot/01-minimal-bot.js` - Bot simple
- `bot/02-advanced-bot.js` - Bot avec commandes
- `bot/03-advanced-bot.js` - Bot production

## Aide

Des problèmes ? Consultez:

- [Guide de Dépannage](../docs/troubleshooting.md)
