/**
 * ZK-Whistle Type Definitions
 *
 * Strict TypeScript types for all domain objects across the three modules:
 * - Module A: The Vault (Dead Man's Switch)
 * - Module B: Identity & Reputation (Reclaim / zkTLS)
 * - Module C: The Marketplace (Anonymous Exchange)
 */

// -------------------------------------------------------
// Module A: Vault / Dead Man's Switch
// -------------------------------------------------------

/** Configuration for creating a new vault (Dead Man's Switch) */
export type VaultConfig = {
  heartbeatInterval: number; // seconds between required check-ins
  arweaveTxId: string; // Arweave transaction ID of encrypted payload
  litAccessControlId: string; // Lit Protocol access-control reference
  recipient: string; // Ethereum address or "0x0" for public release
};

/** On-chain switch state mirroring DeadMansSwitch.sol */
export type SwitchDetails = {
  lastHeartbeat: bigint;
  heartbeatInterval: bigint;
  arweaveTxId: string;
  litAccessControlId: string;
  recipient: string;
  isActive: boolean;
};

/** Result of client-side AES-256-GCM encryption */
export type EncryptedPayload = {
  ciphertext: Uint8Array;
  iv: Uint8Array; // 12-byte initialization vector
  exportedKey: Uint8Array; // raw AES key bytes (to be encrypted by Lit)
};

/** Metadata stored alongside the encrypted file on Arweave */
export type ArweavePayloadMetadata = {
  fileName: string;
  mimeType: string;
  encryptedAt: number; // Unix timestamp
  version: string; // schema version for forward compatibility
};

// -------------------------------------------------------
// Lit Protocol Types
// -------------------------------------------------------

/**
 * A single Lit Protocol EVM-contract access control condition (SDK v8 shape).
 * Structurally matches `@lit-protocol/accs-schemas` LPACC_EVM_CONTRACT.
 */
export type LitAccessControlCondition = {
  conditionType?: string; // "evmContract" for custom contract calls
  contractAddress: string;
  chain: string; // must be a Lit-supported chain name
  functionName: string;
  functionParams: string[];
  functionAbi: {
    name: string;
    type?: string;
    stateMutability: string;
    constant?: boolean;
    inputs: { name: string; type: string; internalType?: string }[];
    outputs: { name: string; type: string; internalType?: string }[];
  };
  returnValueTest: {
    key: string;
    comparator: string;
    value: string;
  };
};

/** The encrypted symmetric key returned by Lit after encryption */
export type LitEncryptedKey = {
  ciphertext: string; // base64 encrypted symmetric key
  dataToEncryptHash: string; // hash of the data that was encrypted
  chain: string; // Lit chain the access-control conditions read from
};

/** Result of the full vault creation flow */
export type VaultCreationResult = {
  arweaveTxId: string;
  litEncryptedKey: LitEncryptedKey;
  accessControlConditions: LitAccessControlCondition[];
  switchTxHash: string; // on-chain transaction hash
};

/**
 * Self-describing payload stored on Arweave for a vault. Contains everything a
 * recipient needs to decrypt once the Dead Man's Switch triggers — except the
 * plaintext, which never exists outside the creator's browser.
 *
 * `payload` is the AES-256-GCM ciphertext of the file. `lit` is the AES key
 * sealed by Lit under the on-chain access-control conditions; it is `null` when
 * the vault was created on a non-Lit-supported chain (creation-pipeline demo
 * only — no key escrow, data is not recoverable).
 */
export type VaultManifest = {
  version: string;
  app: "ZK-Whistle";
  encryption: "AES-256-GCM";
  file: { name: string; mimeType: string; size: number; encryptedAt: number };
  payload: { iv: string; ciphertext: string }; // base64
  lit: {
    network: string;
    chain: string;
    ciphertext: string; // Lit-sealed AES key
    dataToEncryptHash: string;
    accessControlConditions: LitAccessControlCondition[];
  } | null;
  recipient: string;
};

// -------------------------------------------------------
// Module B: Identity & Reputation (Reclaim Protocol)
// -------------------------------------------------------

/** Reclaim Protocol proof parameters */
export type ReclaimProofParams = {
  provider: string; // e.g. "twitter-account-age", "corporate-portal"
  context: string; // human-readable description
  parameters: Record<string, string>; // provider-specific params
};

/** Reclaim Protocol proof result */
export type ReclaimProof = {
  identifier: string;
  claimData: {
    provider: string;
    parameters: string; // JSON string
    owner: string; // wallet address
    timestampS: number;
    context: string;
    epoch: number;
  };
  signatures: string[];
  witnesses: Array<{
    id: string;
    url: string;
  }>;
};

/** On-chain representation of a verified proof */
export type ProofRegistration = {
  proofHash: string; // bytes32 keccak256 of serialized proof
  submittedAt: number; // block timestamp
};

/** User identity profile combining on-chain and off-chain data */
export type UserIdentityProfile = {
  address: string;
  isVerified: boolean;
  proofCount: number;
  proofHashes: string[];
  registeredAt: number;
  stealthMetaAddress: string;
  // Off-chain enrichment (from stored proofs)
  proofs?: ReclaimProof[];
};

// -------------------------------------------------------
// Module C: Marketplace
// -------------------------------------------------------

/** Marketplace listing as stored on-chain */
export type MarketplaceListing = {
  id: number;
  whistleblower: string;
  descriptionHash: string; // IPFS/Arweave CID of encrypted description
  arweaveTxId: string;
  minimumBid: bigint;
  isActive: boolean;
  isVerified: boolean;
  createdAt: bigint;
  bidCount: number;
};

/** Bid on a marketplace listing */
export type MarketplaceBid = {
  bidder: string;
  amount: bigint;
  isAccepted: boolean;
  isWithdrawn: boolean;
};

/** Listing creation parameters */
export type CreateListingParams = {
  descriptionHash: string;
  arweaveTxId: string;
  minimumBid: bigint;
  isVerified: boolean;
};

// -------------------------------------------------------
// ERC-5564 Stealth Addresses
// -------------------------------------------------------

/** Stealth meta-address (published by the receiver) */
export type StealthMetaAddress = {
  spendingPublicKey: string; // hex public key
  viewingPublicKey: string; // hex public key
  prefix: string; // "st:eth:" per ERC-5564
};

/** Derived one-time stealth address for payment */
export type StealthPaymentInfo = {
  stealthAddress: string; // derived one-time address
  ephemeralPublicKey: string; // published by sender for receiver to scan
  viewTag: number; // first byte of shared secret for fast scanning
};

/** Stealth key pair held by the receiver */
export type StealthKeyPair = {
  spendingPrivateKey: string;
  spendingPublicKey: string;
  viewingPrivateKey: string;
  viewingPublicKey: string;
};

// -------------------------------------------------------
// UI State Types
// -------------------------------------------------------

/** Generic async operation state */
export type AsyncOperationState<T = undefined> = {
  isLoading: boolean;
  error: string | null;
  data: T | null;
};

/** Steps in the vault creation wizard */
export type VaultCreationStep = "select-file" | "set-conditions" | "register";

/** Overall app navigation context */
export type AppSection = "vault" | "identity" | "marketplace";
