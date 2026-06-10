/**
 * Arweave storage service (client side).
 *
 * Encrypted vault manifests are uploaded to Arweave through the `/api/storage`
 * server route, which signs/stores them with the Turbo SDK. Uploads under
 * 100 KiB are free, need no wallet, no funding transaction, and no testnet gas —
 * the brittle Irys bundler-funding dance is gone. Data lands on Arweave mainnet
 * (permanent, censorship-resistant) and is read back by transaction id.
 */
import type { ArweavePayloadMetadata } from "~~/types/zk-whistle";

const ARWEAVE_GATEWAY = "https://arweave.net";
const STORAGE_ENDPOINT = "/api/storage";

/**
 * Upload an encrypted payload to Arweave via the hardened server route.
 * Metadata travels as request headers and is attached as Arweave tags.
 *
 * @returns Arweave transaction id
 */
export async function uploadToArweave(data: Uint8Array, metadata: ArweavePayloadMetadata): Promise<string> {
  const response = await fetch(STORAGE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "x-zkw-file-name": encodeURIComponent(metadata.fileName),
      "x-zkw-mime-type": metadata.mimeType,
      "x-zkw-version": metadata.version,
    },
    body: data,
  });

  if (!response.ok) {
    let message = `Storage upload failed (${response.status}).`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* fall back to the generic status message */
    }
    throw new Error(message);
  }

  const { id } = (await response.json()) as { id: string };
  return id;
}

/**
 * Fetch an encrypted payload from Arweave by transaction id.
 */
export async function fetchFromArweave(txId: string): Promise<Uint8Array> {
  const response = await fetch(`${ARWEAVE_GATEWAY}/${txId}`);
  if (!response.ok) {
    throw new Error(`Arweave fetch failed for ${txId}: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Build an Arweave gateway URL for a transaction id.
 */
export function getArweaveUrl(txId: string): string {
  return `${ARWEAVE_GATEWAY}/${txId}`;
}
