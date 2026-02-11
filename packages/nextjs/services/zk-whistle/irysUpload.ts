/**
 * Irys/Arweave upload service.
 * Uploads encrypted payloads to Arweave for permanent, censorship-resistant storage.
 * Uses the Irys web upload SDK with Ethereum wallet-based payment.
 */
import type { ArweavePayloadMetadata } from "~~/types/zk-whistle";

const IRYS_NODE_URL = "https://node2.irys.xyz";
const ARWEAVE_GATEWAY = "https://arweave.net";

/**
 * Upload encrypted data to Arweave via the Irys network.
 * Tags include metadata for retrieval and identification.
 *
 * @param encryptedData - The serialized encrypted payload (ciphertext + IV)
 * @param metadata - File metadata (name, type, timestamp)
 * @param walletProvider - Ethereum provider from the connected wallet
 * @returns Arweave transaction ID
 */
export async function uploadToArweave(
  encryptedData: Uint8Array,
  metadata: ArweavePayloadMetadata,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  walletProvider?: any,
): Promise<string> {
  try {
    // Dynamic import to avoid SSR issues
    const { WebUploader } = await import("@irys/web-upload");
    const { WebEthereum } = await import("@irys/web-upload-ethereum");

    const irys = await WebUploader(WebEthereum).withProvider(walletProvider);

    // Build tags for the upload
    const tags = [
      { name: "Content-Type", value: "application/octet-stream" },
      { name: "App-Name", value: "ZK-Whistle" },
      { name: "App-Version", value: metadata.version },
      { name: "File-Name", value: metadata.fileName },
      { name: "Original-Type", value: metadata.mimeType },
      { name: "Encrypted-At", value: metadata.encryptedAt.toString() },
      { name: "Encryption-Algorithm", value: "AES-256-GCM" },
    ];

    // Fund the upload if needed
    const price = await irys.getPrice(encryptedData.length);
    const balance = await irys.getLoadedBalance();

    if (balance.lt(price)) {
      await irys.fund(price);
    }

    // Upload the data
    const receipt = await irys.upload(Buffer.from(encryptedData), { tags });
    return receipt.id;
  } catch (error) {
    throw new Error(`Arweave upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Fetch encrypted data from Arweave by transaction ID.
 *
 * @param txId - Arweave transaction ID
 * @returns The encrypted data as Uint8Array
 */
export async function fetchFromArweave(txId: string): Promise<Uint8Array> {
  try {
    const response = await fetch(`${ARWEAVE_GATEWAY}/${txId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch from Arweave: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    throw new Error(`Arweave fetch failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get the estimated cost of uploading data to Arweave.
 *
 * @param dataSize - Size of the data in bytes
 * @param walletProvider - Ethereum provider
 * @returns Cost in ETH as a string
 */
export async function getUploadCost(
  dataSize: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  walletProvider?: any,
): Promise<string> {
  try {
    const { WebUploader } = await import("@irys/web-upload");
    const { WebEthereum } = await import("@irys/web-upload-ethereum");

    const irys = await WebUploader(WebEthereum).withProvider(walletProvider);
    const price = await irys.getPrice(dataSize);
    return irys.utils.fromAtomic(price).toString();
  } catch (error) {
    throw new Error(`Cost estimation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Build an Arweave gateway URL for a transaction ID.
 */
export function getArweaveUrl(txId: string): string {
  return `${ARWEAVE_GATEWAY}/${txId}`;
}

/**
 * Build an Irys explorer URL for a transaction.
 */
export function getIrysExplorerUrl(txId: string): string {
  return `${IRYS_NODE_URL}/tx/${txId}`;
}
