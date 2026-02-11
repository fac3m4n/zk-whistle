/**
 * ERC-5564 Stealth Address utility.
 * Implements stealth address generation, derivation, and scanning
 * to break the on-chain link between payer and receiver.
 *
 * Uses secp256k1 elliptic curve cryptography via @noble/secp256k1.
 *
 * Flow:
 * 1. Receiver publishes a "stealth meta-address" (spending + viewing public keys)
 * 2. Sender generates an ephemeral key pair, derives a one-time stealth address
 * 3. Sender publishes the ephemeral public key for the receiver to scan
 * 4. Receiver scans ephemeral keys with their viewing key to find payments
 * 5. Receiver derives the spending key for the stealth address
 */
import { sha256 } from "@noble/hashes/sha2.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import * as secp from "@noble/secp256k1";
import type { StealthKeyPair, StealthMetaAddress, StealthPaymentInfo } from "~~/types/zk-whistle";

const STEALTH_PREFIX = "st:eth:";

/**
 * Generate a new stealth key pair (spending + viewing keys).
 * The spending key controls funds; the viewing key is used to scan for payments.
 */
export function generateStealthKeyPair(): StealthKeyPair {
  const spendingPrivateKey = secp.utils.randomSecretKey();
  const viewingPrivateKey = secp.utils.randomSecretKey();

  const spendingPublicKey = secp.getPublicKey(spendingPrivateKey, true);
  const viewingPublicKey = secp.getPublicKey(viewingPrivateKey, true);

  return {
    spendingPrivateKey: bytesToHex(spendingPrivateKey),
    spendingPublicKey: bytesToHex(spendingPublicKey),
    viewingPrivateKey: bytesToHex(viewingPrivateKey),
    viewingPublicKey: bytesToHex(viewingPublicKey),
  };
}

/**
 * Create a stealth meta-address string from a key pair.
 * Format: "st:eth:<spending_pub_key><viewing_pub_key>"
 */
export function createStealthMetaAddress(keyPair: StealthKeyPair): StealthMetaAddress {
  return {
    spendingPublicKey: keyPair.spendingPublicKey,
    viewingPublicKey: keyPair.viewingPublicKey,
    prefix: STEALTH_PREFIX,
  };
}

/**
 * Serialize a stealth meta-address to a string for on-chain storage.
 */
export function serializeStealthMetaAddress(metaAddress: StealthMetaAddress): string {
  return `${metaAddress.prefix}${metaAddress.spendingPublicKey}${metaAddress.viewingPublicKey}`;
}

/**
 * Parse a serialized stealth meta-address string.
 */
export function parseStealthMetaAddress(serialized: string): StealthMetaAddress {
  if (!serialized.startsWith(STEALTH_PREFIX)) {
    throw new Error("Invalid stealth meta-address prefix");
  }

  const data = serialized.slice(STEALTH_PREFIX.length);
  // Compressed public keys are 66 hex chars (33 bytes)
  const spendingPublicKey = data.slice(0, 66);
  const viewingPublicKey = data.slice(66);

  if (spendingPublicKey.length !== 66 || viewingPublicKey.length !== 66) {
    throw new Error("Invalid stealth meta-address key lengths");
  }

  return {
    spendingPublicKey,
    viewingPublicKey,
    prefix: STEALTH_PREFIX,
  };
}

/**
 * Derive a one-time stealth address for a payment.
 * Called by the SENDER (journalist) using the receiver's meta-address.
 *
 * @param metaAddress - The receiver's published stealth meta-address
 * @returns The stealth address and ephemeral public key
 */
export function deriveStealthAddress(metaAddress: StealthMetaAddress): StealthPaymentInfo {
  // Generate ephemeral key pair
  const ephemeralPrivateKey = secp.utils.randomSecretKey();
  const ephemeralPublicKey = secp.getPublicKey(ephemeralPrivateKey, true);

  // Compute shared secret: ephemeral_priv * viewing_pub
  const viewingPubBytes = hexToBytes(metaAddress.viewingPublicKey);
  const sharedSecret = secp.getSharedSecret(ephemeralPrivateKey, viewingPubBytes, true);

  // Hash the shared secret to get the stealth key offset
  const hashedSecret = sha256(sharedSecret);

  // Derive the stealth public key: spending_pub + hash(shared_secret) * G
  const spendingPubPoint = secp.Point.fromHex(metaAddress.spendingPublicKey);
  const offsetPoint = secp.Point.BASE.multiply(bytesToBigInt(hashedSecret));
  const stealthPubPoint = spendingPubPoint.add(offsetPoint);
  const stealthPubKey = stealthPubPoint.toBytes(false); // uncompressed

  // Derive Ethereum address from public key (last 20 bytes of keccak256)
  const stealthAddress = publicKeyToAddress(stealthPubKey);

  // View tag: first byte of the hashed shared secret (for fast scanning)
  const viewTag = hashedSecret[0];

  return {
    stealthAddress,
    ephemeralPublicKey: bytesToHex(ephemeralPublicKey),
    viewTag,
  };
}

/**
 * Scan for payments addressed to the receiver.
 * Called by the RECEIVER (whistleblower) with their viewing key.
 *
 * @param viewingPrivateKey - The receiver's private viewing key
 * @param spendingPublicKey - The receiver's spending public key
 * @param announcements - List of ephemeral public keys published by senders
 * @returns Stealth payment info for payments that match
 */
export function scanForPayments(
  viewingPrivateKey: string,
  spendingPublicKey: string,
  announcements: Array<{ ephemeralPublicKey: string; viewTag: number; stealthAddress: string }>,
): StealthPaymentInfo[] {
  const viewPrivBytes = hexToBytes(viewingPrivateKey);
  const spendingPubPoint = secp.Point.fromHex(spendingPublicKey);

  const matches: StealthPaymentInfo[] = [];

  for (const announcement of announcements) {
    const ephPubBytes = hexToBytes(announcement.ephemeralPublicKey);

    // Compute shared secret: viewing_priv * ephemeral_pub
    const sharedSecret = secp.getSharedSecret(viewPrivBytes, ephPubBytes, true);
    const hashedSecret = sha256(sharedSecret);

    // Quick view tag check
    if (hashedSecret[0] !== announcement.viewTag) {
      continue; // Not for us
    }

    // Derive expected stealth address
    const offsetPoint = secp.Point.BASE.multiply(bytesToBigInt(hashedSecret));
    const expectedPubPoint = spendingPubPoint.add(offsetPoint);
    const expectedPubKey = expectedPubPoint.toBytes(false);
    const expectedAddress = publicKeyToAddress(expectedPubKey);

    if (expectedAddress.toLowerCase() === announcement.stealthAddress.toLowerCase()) {
      matches.push({
        stealthAddress: announcement.stealthAddress,
        ephemeralPublicKey: announcement.ephemeralPublicKey,
        viewTag: announcement.viewTag,
      });
    }
  }

  return matches;
}

// -------------------------------------------------------
// Utility functions
// -------------------------------------------------------

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (const byte of bytes) {
    result = (result << 8n) | BigInt(byte);
  }
  // Ensure the result is within the secp256k1 order
  const ORDER = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
  return result % ORDER;
}

function publicKeyToAddress(uncompressedPubKey: Uint8Array): string {
  // Remove the 0x04 prefix if present
  const pubKeyData = uncompressedPubKey[0] === 4 ? uncompressedPubKey.slice(1) : uncompressedPubKey;
  const hash = keccak_256(pubKeyData);
  const addressBytes = hash.slice(-20);
  return "0x" + bytesToHex(addressBytes);
}
