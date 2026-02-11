/**
 * Client-side AES-256-GCM encryption service.
 * All encryption/decryption happens in the browser using the Web Crypto API.
 * No plaintext data ever leaves the client.
 */
import type { EncryptedPayload } from "~~/types/zk-whistle";

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96-bit IV recommended for AES-GCM

/**
 * Generate a new AES-256-GCM symmetric key.
 * The key is extractable so it can be exported and encrypted by Lit Protocol.
 */
export async function generateSymmetricKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true, // extractable — needed to export and encrypt via Lit
    ["encrypt", "decrypt"],
  );
}

/**
 * Export a CryptoKey to raw bytes for encryption by Lit Protocol.
 */
export async function exportKey(key: CryptoKey): Promise<Uint8Array> {
  const rawKey = await crypto.subtle.exportKey("raw", key);
  return new Uint8Array(rawKey);
}

/**
 * Import raw key bytes back into a CryptoKey (after decryption by Lit Protocol).
 */
export async function importKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", rawKey, { name: ALGORITHM, length: KEY_LENGTH }, false, ["encrypt", "decrypt"]);
}

/**
 * Encrypt arbitrary data using AES-256-GCM.
 * Returns the ciphertext, IV, and the exported key bytes.
 *
 * @param data - The plaintext data to encrypt
 * @param existingKey - Optional existing key; generates a new one if not provided
 */
export async function encryptData(data: Uint8Array, existingKey?: CryptoKey): Promise<EncryptedPayload> {
  const key = existingKey ?? (await generateSymmetricKey());
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, data);

  const exportedKey = await exportKey(key);

  return {
    ciphertext: new Uint8Array(ciphertext),
    iv,
    exportedKey,
  };
}

/**
 * Decrypt AES-256-GCM encrypted data.
 *
 * @param ciphertext - The encrypted data
 * @param iv - The initialization vector used during encryption
 * @param key - The CryptoKey to use for decryption
 */
export async function decryptData(ciphertext: Uint8Array, iv: Uint8Array, key: CryptoKey): Promise<Uint8Array> {
  const plaintext = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);
  return new Uint8Array(plaintext);
}

/**
 * Encrypt a File object. Reads the file, encrypts the content,
 * and returns the encrypted payload.
 *
 * @param file - Browser File object from file input or drag-and-drop
 */
export async function encryptFile(file: File): Promise<EncryptedPayload> {
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  return encryptData(data);
}

/**
 * Decrypt an encrypted payload back into file bytes.
 *
 * @param payload - The encrypted payload (ciphertext + IV)
 * @param rawKey - Raw AES key bytes (decrypted from Lit Protocol)
 */
export async function decryptPayload(payload: EncryptedPayload, rawKey: Uint8Array): Promise<Uint8Array> {
  const key = await importKey(rawKey);
  return decryptData(payload.ciphertext, payload.iv, key);
}

/**
 * Serialize an EncryptedPayload into a single Uint8Array for storage.
 * Format: [4 bytes IV length][IV][ciphertext]
 * The exported key is NOT included — it goes to Lit Protocol separately.
 */
export function serializePayload(payload: EncryptedPayload): Uint8Array {
  const ivLength = new Uint32Array([payload.iv.length]);
  const ivLengthBytes = new Uint8Array(ivLength.buffer);

  const result = new Uint8Array(ivLengthBytes.length + payload.iv.length + payload.ciphertext.length);
  result.set(ivLengthBytes, 0);
  result.set(payload.iv, ivLengthBytes.length);
  result.set(payload.ciphertext, ivLengthBytes.length + payload.iv.length);

  return result;
}

/**
 * Deserialize a stored payload back into its components.
 * Parses the format produced by serializePayload().
 */
export function deserializePayload(data: Uint8Array): { iv: Uint8Array; ciphertext: Uint8Array } {
  const ivLengthBytes = data.slice(0, 4);
  const ivLength = new Uint32Array(ivLengthBytes.buffer)[0];

  const iv = data.slice(4, 4 + ivLength);
  const ciphertext = data.slice(4 + ivLength);

  return { iv, ciphertext };
}
