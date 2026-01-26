/**
 * Signal CLI SDK TypeScript Interfaces
 * 
 * This file contains comprehensive type definitions for the Signal CLI SDK,
 * which uses JSON-RPC communication with signal-cli for optimal performance.
 * 
 * @author Signal SDK Team
 * @version 0.1.0
 */

// ===== DEPRECATED INTERFACES =====

/**
 * @deprecated This interface is no longer used since switching to JSON-RPC format.
 * Recipients are now passed as simple string arrays instead of Address objects.
 * Keep for backward compatibility but avoid using in new code.
 */
export interface Address {
    number?: string;
    uuid?: string;
    name?: string;
}



// ===== JSON-RPC CORE INTERFACES =====

/**
 * Standard JSON-RPC 2.0 request structure used for all signal-cli communication.
 * 
 * @example
 * ```typescript
 * const request: JsonRpcRequest = {
 *   jsonrpc: '2.0',
 *   method: 'send',
 *   params: { recipients: ['+33123456789'], message: 'Hello!' },
 *   id: 'msg_001'
 * };
 * ```
 */
export interface JsonRpcRequest {
    /** Always '2.0' for JSON-RPC 2.0 compliance */
    jsonrpc: '2.0';
    /** The method name to call on signal-cli */
    method: string;
    /** Parameters to pass to the method (method-specific) */
    params?: any;
    /** Unique identifier for this request */
    id: string;
}

/**
 * Standard JSON-RPC 2.0 response structure received from signal-cli.
 * Contains either a result or an error, never both.
 */
export interface JsonRpcResponse {
    /** Always '2.0' for JSON-RPC 2.0 compliance */
    jsonrpc: '2.0';
    /** The same ID as the request that generated this response */
    id: string;
    /** The result data (present only on success) */
    result?: any;
    /** Error information (present only on failure) */
    error?: {
        /** Error code (negative for implementation-defined errors) */
        code: number;
        /** Human-readable error message */
        message: string;
        /** Additional error data (optional) */
        data?: any;
    };
}

/**
 * JSON-RPC 2.0 notification structure for asynchronous events from signal-cli.
 * Notifications don't have an ID and don't expect a response.
 * 
 * @example
 * ```typescript
 * // Incoming message notification
 * {
 *   jsonrpc: '2.0',
 *   method: 'receive',
 *   params: { envelope: { source: '+33123456789', dataMessage: { ... } } }
 * }
 * ```
 */
export interface JsonRpcNotification {
    /** Always '2.0' for JSON-RPC 2.0 compliance */
    jsonrpc: '2.0';
    /** The notification method name */
    method: string;
    /** Parameters for the notification */
    params?: any;
}

// ===== JSON-RPC SPECIFIC PARAMETER INTERFACES =====

/**
 * Parameters for the 'send' JSON-RPC method.
 * Used for sending messages to individual recipients or groups.
 */
export interface JsonRpcSendParams {
    /** Array of recipient phone numbers (for direct messages) */
    recipients?: string[];
    /** Group ID (for group messages) - mutually exclusive with recipients */
    groupId?: string;
    /** The message text to send */
    message?: string;
    /** Array of attachment file paths */
    attachments?: string[];
    /** Array of mentions in the message */
    mentions?: JsonRpcMention[];
    /** Array of text styles (bold, italic, etc.) */
    textStyles?: JsonRpcTextStyle[];
    /** Quote/reply information */
    quote?: JsonRpcQuote;
    /** Sticker information */
    sticker?: JsonRpcSticker;
    /** Message expiration time in seconds */
    expiresInSeconds?: number;
    /** Whether this is a view-once message */
    isViewOnce?: boolean;
}

/**
 * Parameters for the 'send_reaction' JSON-RPC method.
 */
export interface JsonRpcReactionParams {
    /** Recipient phone number */
    recipient?: string;
    /** Group ID (for group reactions) */
    groupId?: string;
    /** Author of the message being reacted to */
    targetAuthor: string;
    /** Timestamp of the message being reacted to */
    targetTimestamp: number;
    /** Emoji to react with */
    emoji: string;
    /** Whether to remove the reaction */
    remove?: boolean;
}

/**
 * Parameters for the 'send_typing' JSON-RPC method.
 */
export interface JsonRpcTypingParams {
    /** Array of recipient phone numbers */
    recipients?: string[];
    /** Group ID (for group typing indicators) */
    groupId?: string;
    /** Typing action: 'start' or 'stop' */
    action: 'start' | 'stop';
}

/**
 * Parameters for blocking/unblocking users.
 */
export interface JsonRpcBlockParams {
    /** Array of phone numbers to block/unblock */
    recipient: string[];
}

/**
 * Parameters for updating group information.
 */
export interface JsonRpcUpdateGroupParams {
    /** Group ID to update */
    groupId: string;
    /** New group name */
    name?: string;
    /** New group description */
    description?: string;
    /** Path to new group avatar image */
    avatar?: string;
    /** Members to add to the group */
    addMembers?: string[];
    /** Members to remove from the group */
    removeMembers?: string[];
    /** Members to promote to admin */
    promoteAdmins?: string[];
    /** Members to demote from admin */
    demoteAdmins?: string[];
    /** Members to ban from the group */
    banMembers?: string[];
    /** Members to unban from the group */
    unbanMembers?: string[];
    /** Who can add members: 'EVERY_MEMBER' or 'ONLY_ADMINS' */
    permissionAddMember?: 'EVERY_MEMBER' | 'ONLY_ADMINS';
    /** Who can edit group details: 'EVERY_MEMBER' or 'ONLY_ADMINS' */
    permissionEditDetails?: 'EVERY_MEMBER' | 'ONLY_ADMINS';
    /** Who can send messages: 'EVERY_MEMBER' or 'ONLY_ADMINS' */
    permissionSendMessage?: 'EVERY_MEMBER' | 'ONLY_ADMINS';
    /** Whether only admins can send messages */
    announcementsOnly?: boolean;
    /** Message expiration timer in seconds */
    expirationTimer?: number;
    /** Whether to reset the group invite link */
    resetInviteLink?: boolean;
}

/**
 * Mention information for JSON-RPC messages.
 */
export interface JsonRpcMention {
    /** Start position in the message text */
    start: number;
    /** Length of the mention */
    length: number;
    /** Phone number of the mentioned user */
    number: string;
}

/**
 * Text style information for JSON-RPC messages.
 */
export interface JsonRpcTextStyle {
    /** Start position in the message text */
    start: number;
    /** Length of the styled text */
    length: number;
    /** Style type */
    style: 'BOLD' | 'ITALIC' | 'STRIKETHROUGH' | 'MONOSPACE' | 'SPOILER';
}

/**
 * Quote/reply information for JSON-RPC messages.
 */
export interface JsonRpcQuote {
    /** Timestamp of the quoted message */
    timestamp: number;
    /** Author of the quoted message */
    author: string;
    /** Text of the quoted message */
    text?: string;
    /** Attachments in the quoted message */
    attachments?: JsonAttachment[];
    /** Mentions in the quoted message */
    mentions?: JsonRpcMention[];
}

/**
 * Sticker information for JSON-RPC messages.
 */
export interface JsonRpcSticker {
    /** Sticker pack ID */
    packId: string;
    /** Sticker ID within the pack */
    stickerId: number;
    /** Pack key for encrypted sticker packs */
    packKey?: string;
    /** Associated emoji */
    emoji?: string;
}

/**
 * Attachment information for JSON-RPC communication.
 * This is the format expected by signal-cli for attachments.
 */
export interface JsonAttachment {
    /** Attachment ID (for existing attachments) */
    id?: string;
    /** MIME content type */
    contentType: string;
    /** Original filename */
    filename?: string;
    /** File size in bytes */
    size?: number;
    /** Base64 encoded thumbnail */
    thumbnail?: string;
    /** Whether this is a voice note */
    voiceNote?: boolean;
    /** Image width in pixels */
    width?: number;
    /** Image height in pixels */
    height?: number;
}

// ===== LEGACY PARAMETER INTERFACES (KEPT FOR COMPATIBILITY) =====

/**
 * @deprecated Use JsonRpcSendParams instead. 
 * Legacy interface for send request parameters.
 */
export interface SendRequestParams {
    recipient?: Address;
    recipientGroupId?: string;
    message: string;
    attachments?: JsonAttachment[];
}

/**
 * Response from send operations.
 */
export interface SendResponse {
    /** Timestamp when the message was sent */
    timestamp: number;
    /** Array of delivery results */
    results: any[];
}

/**
 * Group information as returned by signal-cli.
 */
export interface GroupInfo {
    /** Base64 encoded group ID */
    groupId: string;
    /** Alias for groupId */
    id?: string;
    /** Group display name */
    name: string;
    /** Group description */
    description?: string;
    /** Whether the current user is a member */
    isMember: boolean;
    /** Whether the group is blocked */
    isBlocked: boolean;
    /** Message expiration time in seconds */
    messageExpirationTime: number;
    /** Current group members */
    members: Address[];
    /** Members with pending invitations */
    pendingMembers: Address[];
    /** Members requesting to join */
    requestingMembers: Address[];
    /** Group administrators */
    admins: Address[];
    /** Banned members */
    banned: Address[];
    /** Permission setting for adding members */
    permissionAddMember: string;
    /** Permission setting for editing group details */
    permissionEditDetails: string;
    /** Permission setting for sending messages */
    permissionSendMessage: string;
    /** Group invite link */
    groupInviteLink?: string;
    /** Alias for groupInviteLink */
    inviteLink?: string;
}


/**
 * Represents a received message.
 */
export interface Message {
  id?: string;
  source: string;
  sourceUuid?: string;
  sourceDevice?: number;
  text?: string;
  timestamp: number;
  attachments?: Attachment[];
  reactions?: Reaction[];
  reaction?: any;
  groupId?: string;
  groupInfo?: {
    id: string;
    name?: string;
  };
  quote?: {
    id: number;
    author: string;
    text?: string;
    attachments?: Attachment[];
    mentions?: Mention[];
  };
  mentions?: Mention[];
  sticker?: Sticker;
  textStyles?: TextStyle[];
  expiresInSeconds?: number;
  isViewOnce?: boolean;
  viewOnce?: boolean;
  remoteDelete?: boolean;
  isExpirationUpdate?: boolean;
  syncMessage?: any;
  receipt?: any;
  typing?: any;
}

/**
 * Represents a mention in a message.
 */
export interface Mention {
  start: number;
  length: number;
  number: string;
  recipient?: string;  // Alias for number, for compatibility
  name?: string;
}

/**
 * Represents text styling in a message.
 */
export interface TextStyle {
  start: number;
  length: number;
  style: 'BOLD' | 'ITALIC' | 'STRIKETHROUGH' | 'MONOSPACE' | 'SPOILER';
}

/**
 * Represents a sticker in a message.
 */
export interface Sticker {
  packId: string;
  stickerId: number;
  packKey?: string;
  emoji?: string;
}

/**
 * Represents a reaction to a message.
 */
export interface Reaction {
  emoji: string;
  sender: string;
  timestamp: number;
}

/**
 * Represents a contact in Signal.
 */
export interface Contact {
  number: string;
  name: string;
  uuid?: string;
  blocked: boolean;
  profileName?: string;
  /** Given name (first name) from profile */
  givenName?: string;
  /** Family name (last name) from profile */
  familyName?: string;
  /** MobileCoin address for payments */
  mobileCoinAddress?: string;
  profileAvatar?: string;
  color?: string;
  archived?: boolean;
  mutedUntil?: number;
  hideStory?: boolean;
  /** Profile key for encrypted profile access */
  profileKey?: string;
  /** Contact's username */
  username?: string;
  /** Whether this contact is a registered Signal user */
  registered?: boolean;
}

/**
 * Represents a Signal group.
 */
export interface Group {
  id: string;
  name: string;
  members: string[];
  admins?: string[];
  /** Pending members awaiting invite acceptance */
  pendingMembers?: string[];
  /** Banned members who cannot rejoin */
  bannedMembers?: string[];
  /** Group invite link for joining */
  inviteLink?: string;
  /** Whether invite link approval is required */
  inviteLinkRequiresApproval?: boolean;
  isBlocked: boolean;
  isMember: boolean;
  isAdmin?: boolean;
  description?: string;
  avatar?: string;
  color?: string;
  archived?: boolean;
  mutedUntil?: number;
  permissionAddMember?: 'EVERY_MEMBER' | 'ONLY_ADMINS';
  permissionEditDetails?: 'EVERY_MEMBER' | 'ONLY_ADMINS';
  permissionSendMessage?: 'EVERY_MEMBER' | 'ONLY_ADMINS';
  announcementsOnly?: boolean;
  expirationTimer?: number;
  /** Group version (v1 or v2) */
  version?: number;
  /** Group master key for v2 groups */
  masterKey?: string;
}

/**
 * Options for updating a Signal group.
 */
export interface GroupUpdateOptions {
  name?: string;
  description?: string;
  avatar?: string;
  addMembers?: string[];
  removeMembers?: string[];
  promoteAdmins?: string[];
  demoteAdmins?: string[];
  banMembers?: string[];
  unbanMembers?: string[];
  permissionAddMember?: 'EVERY_MEMBER' | 'ONLY_ADMINS';
  permissionEditDetails?: 'EVERY_MEMBER' | 'ONLY_ADMINS';
  permissionSendMessage?: 'EVERY_MEMBER' | 'ONLY_ADMINS';
  announcementsOnly?: boolean;
  expirationTimer?: number;
  resetInviteLink?: boolean;
}

/**
 * Represents an attachment in a message.
 */
export interface Attachment {
  id: string;
  filename: string;
  contentType: string;
  size?: number;
  localPath?: string;
  width?: number;
  height?: number;
  caption?: string;
  voiceNote?: boolean;
  borderless?: boolean;
  gif?: boolean;
  preview?: AttachmentPreview;
}

/**
 * Represents a preview for an attachment.
 */
export interface AttachmentPreview {
  url?: string;
  title?: string;
  description?: string;
  image?: string;
  date?: number;
}

/**
 * Options for sending a message.
 */
export interface SendMessageOptions {
  message?: string;
  attachments?: string[];
  mentions?: Mention[];
  textStyles?: TextStyle[];
  quote?: {
    timestamp: number;
    author: string;
    text?: string;
    attachments?: Attachment[];
    mentions?: Mention[];
    textStyles?: TextStyle[];
  };
  sticker?: Sticker;
  expiresInSeconds?: number;
  isViewOnce?: boolean;
  linkPreview?: boolean;
  previewUrl?: string;
  editTimestamp?: number;
  storyTimestamp?: number;
  storyAuthor?: string;
  noteToSelf?: boolean;
  endSession?: boolean;
}

/**
 * Represents a user profile.
 */
export interface Profile {
  name?: string;
  about?: string;
  aboutEmoji?: string;
  avatar?: string;
  mobileCoinAddress?: string;
  visibleBadgeIds?: string[];
  color?: string;
}

/**
 * Options for updating a contact.
 */
export interface ContactUpdateOptions {
  name?: string;
  color?: string;
  block?: boolean;
  unblock?: boolean;
  archived?: boolean;
  muted?: boolean;
  mutedUntil?: number;
  hideStory?: boolean;
}

/**
 * Represents account configuration.
 */
export interface AccountConfiguration {
  readReceipts?: boolean;
  unidentifiedDeliveryIndicators?: boolean;
  typingIndicators?: boolean;
  linkPreviews?: boolean;
  keepMutedChatsArchived?: boolean;
  universalExpireTimer?: number;
  phoneNumberSharingMode?: 'EVERYBODY' | 'CONTACTS_ONLY' | 'NOBODY';
  phoneNumberDiscoverability?: boolean;
}

/**
 * Options for updating account settings.
 */
export interface AccountUpdateOptions {
  /** Whether the account can be discovered by phone number */
  discoverableByNumber?: boolean;
  /** Who can see the phone number */
  numberSharingMode?: 'EVERYBODY' | 'CONTACTS_ONLY' | 'NOBODY';
}

/**
 * Represents a device linked to the account.
 */
export interface Device {
  id: number;
  name: string;
  created: number;
  lastSeen: number;
}

/**
 * Represents receipt type for sendReceipt method.
 */
export type ReceiptType = 'read' | 'viewed' | 'delivered';

/**
 * Represents a sticker pack.
 */
export interface StickerPack {
  id: string;
  key: string;
  title: string;
  author: string;
  cover?: Sticker;
  stickers: Sticker[];
  installed: boolean;
}

/**
 * Represents typing indicator actions.
 */
export type TypingAction = 'start' | 'stop';

/**
 * Represents different message types for receive operations.
 */
export type MessageType = 'data' | 'typing' | 'receipt' | 'call' | 'sync' | 'story';

/**
 * Options for receiving messages.
 */
export interface ReceiveOptions {
  timeout?: number;
  ignoreAttachments?: boolean;
  ignoreStories?: boolean;
  maxMessages?: number;
  sendReadReceipts?: boolean;
  since?: number;
}

/**
 * Represents a PIN configuration.
 */
export interface PinConfiguration {
  pin?: string;
  registrationLock?: boolean;
}

/**
 * Represents identity key information.
 */
export interface IdentityKey {
  number: string;
  identityKey: string;
  safetyNumber?: string;
  trustLevel?: 'TRUSTED_UNVERIFIED' | 'TRUSTED_VERIFIED' | 'UNTRUSTED' | 'TRUST_ON_FIRST_USE';
  addedDate?: number;
  firstUse?: boolean;
}

/**
 * Represents a user status (registered/unregistered).
 */
export interface UserStatus {
  number: string;
  registered: boolean;
  uuid?: string;
}



// ===== CAPTCHA & RATE LIMITING =====

/**
 * Represents a CAPTCHA challenge.
 */
export interface CaptchaChallenge {
  type: 'CAPTCHA' | 'RATE_LIMIT';
  challenge?: string;
  token?: string;
  url?: string;
}

/**
 * Represents rate limit challenge information.
 */
export interface RateLimitChallenge {
  type: 'RATE_LIMIT';
  retryAfter?: number;
  captchaUrl?: string;
  captchaToken?: string;
}

// ===== DEVICE LINKING =====

/**
 * Options for device linking.
 */
export interface LinkingOptions {
  name?: string;
  qrCodeOutput?: 'console' | 'file' | 'base64';
  qrCodePath?: string;
}

/**
 * Represents QR code data for device linking.
 */
export interface QRCodeData {
  uri: string;
  qrCode?: string;
  qrCodePath?: string;
  qrCodeBase64?: string;
}

/**
 * Represents the result of device linking.
 */
export interface LinkingResult {
  success: boolean;
  deviceId?: number;
  deviceName?: string;
  qrCode?: QRCodeData;
  isLinked?: boolean;
  error?: string;
}

// ===== CONTACT SYNCHRONIZATION =====

/**
 * Options for contact synchronization.
 */
export interface SyncOptions {
  contacts?: boolean;
  groups?: boolean;
  blockedContacts?: boolean;
  configuration?: boolean;
  keys?: boolean;
}

/**
 * Represents the result of contact synchronization.
 */
export interface ContactsSyncResult {
  success: boolean;
  contactsSync?: boolean;
  groupsSync?: boolean;
  configurationSync?: boolean;
  error?: string;
}

// ===== REMAINING FEATURES FOR 100% COMPATIBILITY =====



/**
 * Represents message request response types.
 */
export type MessageRequestResponseType = 'ACCEPT' | 'DELETE' | 'BLOCK' | 'BLOCK_AND_DELETE';

/**
 * Options for responding to message requests.
 */
export interface MessageRequestResponseOptions {
  sender: string;
  responseType: MessageRequestResponseType;
}

/**
 * Represents a payment notification for MobileCoin.
 */
export interface PaymentNotification {
  recipient: string;
  amount?: string;
  currency?: 'MOB' | 'USD';
  note?: string;
  receiptId?: string;
}

/**
 * Enhanced registration options with CAPTCHA support.
 */
export interface RegistrationOptions {
  voice?: boolean;
  captchaToken?: string;
  captchaUrl?: string;
}

/**
 * Enhanced verification options with PIN support.
 */
export interface VerificationOptions {
  pin?: string;
  storagePassword?: string;
}

/**
 * Options for listing contacts.
 */
export interface ListContactsOptions {
  /** Include all known recipients, not only contacts */
  allRecipients?: boolean;
  /** Specify if only blocked or unblocked contacts should be shown */
  blocked?: boolean;
  /** Find contacts with the given contact or profile name */
  name?: string;
  /** List the contacts with more details */
  detailed?: boolean;
  /** Include internal information that's normally not user visible */
  internal?: boolean;
  /** Specify one or more phone numbers to show */
  recipients?: string[];
}

/**
 * Configuration for SignalBot
 */
export interface BotConfig {
  phoneNumber: string;
  admins?: string[];
  group?: {
    name: string;
    description?: string;
    createIfNotExists?: boolean;
    initialMembers?: string[];
    avatar?: string; // Path to local file, URL, or base64 encoded image
  };
  settings?: {
    commandPrefix?: string;
    autoReact?: boolean;
    logMessages?: boolean;
    welcomeNewMembers?: boolean;
    cooldownSeconds?: number;
    maxMessageLength?: number;
  };
}

/**
 * Bot command definition
 */
export interface BotCommand {
  name: string;
  description: string;
  adminOnly?: boolean;
  handler: (message: ParsedMessage, args: string[], bot: any) => Promise<string | null | void>;
}

/**
 * Parsed message for bot handling
 */
export interface ParsedMessage {
  id: string;
  source: string;
  text: string;
  timestamp: number;
  groupInfo?: {
    id: string;
    name?: string;
    groupId?: string;
  };
  isFromAdmin: boolean;
}

/**
 * Bot statistics
 */
export interface BotStats {
  messagesReceived: number;
  commandsExecuted: number;
  startTime: number;
  lastActivity: number;
  activeUsers: number;
}

// ===== ADDITIONAL SIGNAL-CLI FEATURES =====

/**
 * Parameters for removing contacts
 */
export interface RemoveContactOptions {
  /** Hide the contact in the contact list, but keep the data */
  hide?: boolean;
  /** Delete all data associated with this contact, including identity keys and sessions */
  forget?: boolean;
}

/**
 * Parameters for the 'removeContact' JSON-RPC method
 */
export interface JsonRpcRemoveContactParams {
  recipient: string;
  hide?: boolean;
  forget?: boolean;
}

/**
 * User registration status result
 */
export interface UserStatusResult {
  /** Phone number that was checked */
  number: string;
  /** Whether the user is registered on Signal */
  isRegistered: boolean;
  /** User's Signal UUID if registered */
  uuid?: string;
  /** Username if available */
  username?: string;
}

/**
 * Parameters for the 'getUserStatus' JSON-RPC method
 */
export interface JsonRpcGetUserStatusParams {
  /** Phone numbers to check */
  recipients?: string[];
  /** Usernames to check */
  usernames?: string[];
}

/**
 * Payment notification data
 */
export interface PaymentNotificationData {
  /** Base64 encoded receipt blob */
  receipt: string;
  /** Optional note for the payment notification */
  note?: string;
}

/**
 * Parameters for the 'sendPaymentNotification' JSON-RPC method
 */
export interface JsonRpcSendPaymentNotificationParams {
  /** Recipient phone number */
  recipient?: string;
  /** Group ID for group payments */
  groupId?: string;
  /** Base64 encoded receipt blob */
  receipt: string;
  /** Optional note for the payment notification */
  note?: string;
}

/**
 * Sticker pack manifest information
 */
export interface StickerPackManifest {
  /** Path to the manifest.json file or zip file */
  path: string;
  /** Sticker pack title */
  title?: string;
  /** Sticker pack author */
  author?: string;
  /** Cover sticker information */
  cover?: {
    id: number;
    emoji: string;
  };
  /** List of stickers in the pack */
  stickers?: Array<{
    id: number;
    emoji: string;
  }>;
}

/**
 * Result of sticker pack upload
 */
export interface StickerPackUploadResult {
  /** Unique pack ID */
  packId: string;
  /** Pack encryption key */
  packKey: string;
  /** Installation URL for the sticker pack */
  installUrl?: string;
}

/**
 * Parameters for the 'uploadStickerPack' JSON-RPC method
 */
export interface JsonRpcUploadStickerPackParams {
  /** Path to manifest.json or zip file */
  path: string;
}

/**
 * Rate limit challenge result
 */
export interface RateLimitChallengeResult {
  /** Whether the challenge was successful */
  success: boolean;
  /** Time to wait before retry (in seconds) */
  retryAfter?: number;
  /** Additional message from the server */
  message?: string;
}

/**
 * Parameters for the 'submitRateLimitChallenge' JSON-RPC method
 */
export interface JsonRpcSubmitRateLimitChallengeParams {
  /** Challenge token from the proof required error */
  challenge: string;
  /** Captcha token from solved captcha */
  captcha: string;
}

/**
 * Phone number change session information
 */
export interface ChangeNumberSession {
  /** Session identifier */
  session: string;
  /** New phone number */
  newNumber: string;
  /** Challenge token if required */
  challenge?: string;
}

/**
 * Parameters for starting phone number change
 */
export interface JsonRpcStartChangeNumberParams {
  /** New phone number */
  number: string;
  /** Whether to use voice verification */
  voice?: boolean;
  /** Captcha token if required */
  captcha?: string;
}

/**
 * Parameters for finishing phone number change
 */
export interface JsonRpcFinishChangeNumberParams {
  /** Verification code from SMS/voice */
  code: string;
  /** PIN if registration lock is enabled */
  pin?: string;
}

/**
 * Upload progress information
 */
export interface UploadProgress {
  /** Total bytes to upload */
  total: number;
  /** Bytes uploaded so far */
  uploaded: number;
  /** Upload percentage (0-100) */
  percentage: number;
  /** Upload speed in bytes per second */
  speed?: number;
  /** Estimated time remaining in seconds */
  timeRemaining?: number;
}

// ===== POLLS =====

/**
 * Options for creating a poll
 */
export interface PollCreateOptions {
  /** The poll question */
  question: string;
  /** Array of poll options */
  options: string[];
  /** Allow multiple selections (default: true) */
  multiSelect?: boolean;
  /** Recipients to send the poll to */
  recipients?: string[];
  /** Group ID to send the poll to */
  groupId?: string;
}

/**
 * Options for voting on a poll
 */
export interface PollVoteOptions {
  /** Author of the poll */
  pollAuthor: string;
  /** Timestamp of the poll message */
  pollTimestamp: number;
  /** Array of option indexes to vote for */
  optionIndexes: number[];
  /** Vote count (increase for each vote) */
  voteCount?: number;
}

/**
 * Options for terminating a poll
 */
export interface PollTerminateOptions {
  /** Timestamp of the poll message to terminate */
  pollTimestamp: number;
}

// ===== STORIES =====

/**
 * Options for sending a story
 */
export interface StoryOptions {
  /** Story content (text or attachment path) */
  content?: string;
  /** Attachment for the story */
  attachment?: string;
  /** Text attachment with style */
  textAttachment?: {
    text: string;
    textStyle?: 'DEFAULT' | 'REGULAR' | 'BOLD' | 'SERIF' | 'SCRIPT' | 'CONDENSED';
    textForegroundColor?: string;
    textBackgroundColor?: string;
    preview?: {
      url: string;
      title?: string;
      description?: string;
    };
  };
  /** Allow replies (default: true) */
  allowReplies?: boolean;
}

// ===== AVATARS AND ATTACHMENTS =====

/**
 * Options for getting attachment data
 */
export interface GetAttachmentOptions {
  /** Attachment ID */
  id: string;
  /** Recipient who sent the attachment */
  recipient?: string;
  /** Group ID where attachment was sent */
  groupId?: string;
}

/**
 * Options for getting avatar data
 */
export interface GetAvatarOptions {
  /** Contact number for contact avatar */
  contact?: string;
  /** Profile number for profile avatar */
  profile?: string;
  /** Group ID for group avatar */
  groupId?: string;
}

/**
 * Options for getting sticker data
 */
export interface GetStickerOptions {
  /** Sticker pack ID (hex encoded) */
  packId: string;
  /** Sticker index in the pack */
  stickerId: number;
}

// ===== ADVANCED ACCOUNT MANAGEMENT =====

/**
 * Options for updating account information
 */
export interface UpdateAccountOptions {
  /** New device name */
  deviceName?: string;
  /** Username to set (with or without discriminator) */
  username?: string;
  /** Delete the current username */
  deleteUsername?: boolean;
  /** Enable unrestricted unidentified sender */
  unrestrictedUnidentifiedSender?: boolean;
  /** Enable discoverability by phone number */
  discoverableByNumber?: boolean;
  /** Enable number sharing */
  numberSharing?: boolean;
}

/**
 * Result from account update with username
 */
export interface AccountUpdateResult {
  /** Success status */
  success: boolean;
  /** New username with discriminator */
  username?: string;
  /** Username link URL */
  usernameLink?: string;
  /** Error message if failed */
  error?: string;
}

// ===== DEVICE MANAGEMENT =====

/**
 * Options for updating a linked device
 */
export interface UpdateDeviceOptions {
  /** Device ID to update */
  deviceId: number;
  /** New device name */
  deviceName: string;
}

// ===== SYNC AND CONTACTS =====

/**
 * Options for receiving messages
 */
export interface ReceiveOptions {
  /** Timeout in seconds (default: 5) */
  timeout?: number;
  /** Maximum number of messages to receive (default: unlimited) */
  maxMessages?: number;
  /** Skip downloading attachments */
  ignoreAttachments?: boolean;
  /** Skip receiving stories */
  ignoreStories?: boolean;
  /** Send read receipts automatically */
  sendReadReceipts?: boolean;
}

/**
 * Options for sending contacts sync
 */
export interface SendContactsOptions {
  /** Include all recipients, not just contacts */
  includeAllRecipients?: boolean;
}

// ===== LIST OPTIONS =====

/**
 * Options for listing groups
 */
export interface ListGroupsOptions {
  /** Show detailed information */
  detailed?: boolean;
  /** Filter by specific group IDs */
  groupIds?: string[];
}
