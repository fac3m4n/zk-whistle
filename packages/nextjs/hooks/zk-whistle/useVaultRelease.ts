"use client";

import { useCallback, useState } from "react";
import { useWalletClient } from "wagmi";
import { base64ToBytes, decryptData, importKey } from "~~/services/zk-whistle/encryption";
import { fetchFromArweave } from "~~/services/zk-whistle/irysUpload";
import { decryptKeyFromLit, getDecryptAuthContext } from "~~/services/zk-whistle/litProtocol";
import type { VaultManifest } from "~~/types/zk-whistle";

type ReleaseState = {
  isReleasing: boolean;
  error: string | null;
  released: { fileName: string; mimeType: string; bytes: Uint8Array } | null;
};

const LOCAL_PREVIEW_PREFIX = "local-preview:";

/**
 * Orchestrates the release/decrypt flow for a triggered Dead Man's Switch:
 *   fetch Arweave manifest -> Lit authContext decrypt (AES key) -> AES-GCM
 *   decrypt the payload -> hand back the recovered file bytes.
 *
 * NOTE: the Lit decrypt path follows the documented v8 `AuthManager` pattern but
 * has not been validated against a live Naga deployment. It only succeeds once
 * `DeadMansSwitch.isDeceased(owner)` is true on a Lit-supported chain.
 */
export function useVaultRelease() {
  const { data: walletClient } = useWalletClient();
  const [state, setState] = useState<ReleaseState>({ isReleasing: false, error: null, released: null });

  const release = useCallback(
    async (arweaveTxId: string): Promise<ReleaseState["released"]> => {
      setState({ isReleasing: true, error: null, released: null });

      try {
        if (!arweaveTxId || arweaveTxId.startsWith(LOCAL_PREVIEW_PREFIX)) {
          throw new Error("This vault was created in local-preview mode — no payload was stored to release.");
        }
        if (!walletClient) {
          throw new Error("Connect a wallet to authorize decryption.");
        }

        // 1) Fetch + parse the self-describing manifest.
        const manifestBytes = await fetchFromArweave(arweaveTxId);
        let manifest: VaultManifest;
        try {
          manifest = JSON.parse(new TextDecoder().decode(manifestBytes)) as VaultManifest;
        } catch {
          throw new Error("Stored payload is not a valid ZK-Whistle manifest.");
        }
        if (!manifest.lit) {
          throw new Error("This vault has no Lit-escrowed key (local-preview). Nothing to decrypt.");
        }

        // 2) Authorize with the wallet and ask Lit to release the AES key.
        const authContext = await getDecryptAuthContext(walletClient);
        const rawKey = await decryptKeyFromLit(
          {
            ciphertext: manifest.lit.ciphertext,
            dataToEncryptHash: manifest.lit.dataToEncryptHash,
            chain: manifest.lit.chain,
          },
          manifest.lit.accessControlConditions,
          authContext,
          manifest.lit.chain,
        );

        // 3) AES-GCM decrypt the file payload with the recovered key.
        const iv = base64ToBytes(manifest.payload.iv);
        const ciphertext = base64ToBytes(manifest.payload.ciphertext);
        const key = await importKey(rawKey);
        const bytes = await decryptData(ciphertext, iv, key);

        const released = { fileName: manifest.file.name || "released-file", mimeType: manifest.file.mimeType, bytes };
        setState({ isReleasing: false, error: null, released });
        return released;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Release failed";
        setState({ isReleasing: false, error: message, released: null });
        return null;
      }
    },
    [walletClient],
  );

  /** Trigger a browser download of the recovered file. */
  const download = useCallback((released: NonNullable<ReleaseState["released"]>) => {
    const blob = new Blob([released.bytes], { type: released.mimeType || "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = released.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, []);

  const reset = useCallback(() => setState({ isReleasing: false, error: null, released: null }), []);

  return { ...state, release, download, reset };
}
