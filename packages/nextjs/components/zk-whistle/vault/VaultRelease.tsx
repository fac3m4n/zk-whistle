"use client";

import { useCallback } from "react";
import { Address } from "@scaffold-ui/components";
import { zeroAddress } from "viem";
import { ArrowDownTrayIcon, ExclamationTriangleIcon, LockOpenIcon } from "@heroicons/react/24/outline";
import { useVaultRelease } from "~~/hooks/zk-whistle/useVaultRelease";

type VaultReleaseProps = {
  arweaveTxId: string;
  isDeceased: boolean;
  recipient: string;
};

const LOCAL_PREVIEW_PREFIX = "local-preview:";

/**
 * Release/decrypt panel for a triggered Dead Man's Switch.
 * Fetches the Arweave manifest, asks Lit to release the AES key (gated by the
 * on-chain `isDeceased` condition), AES-decrypts the payload, and downloads it.
 */
export const VaultRelease = ({ arweaveTxId, isDeceased, recipient }: VaultReleaseProps) => {
  const { isReleasing, error, released, release, download, reset } = useVaultRelease();

  const isLocalPreview = arweaveTxId.startsWith(LOCAL_PREVIEW_PREFIX);
  const isPublicRelease = recipient === zeroAddress;

  const handleRelease = useCallback(async () => {
    const result = await release(arweaveTxId);
    if (result) {
      download(result);
    }
  }, [release, download, arweaveTxId]);

  if (isLocalPreview) {
    return (
      <div className="alert alert-warning">
        <ExclamationTriangleIcon className="h-6 w-6" />
        <span>
          This vault was created in <span className="font-mono">local-preview</span> mode — no encrypted payload was
          escrowed, so there is nothing to release. Recreate it on a Lit-supported network for the full flow.
        </span>
      </div>
    );
  }

  if (!isDeceased) {
    return (
      <div className="alert">
        <span>
          This switch has <span className="font-medium">not triggered</span> yet. The Lit network will only release the
          decryption key once <span className="font-mono">isDeceased</span> becomes true on-chain.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="alert alert-warning">
        <LockOpenIcon className="h-6 w-6" />
        <div>
          <h3 className="font-bold">Switch triggered — payload is releasable</h3>
          <p className="text-sm">
            {isPublicRelease ? (
              "This is a public release: anyone can decrypt and download the payload."
            ) : (
              <span className="inline-flex items-center gap-1">
                Intended recipient: <Address address={recipient} size="sm" />
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="bg-base-200 rounded-xl p-4 text-sm space-y-1">
        <p className="text-base-content/70">
          Decryption authorizes with your wallet (SIWE) and runs against the Lit MPC network on the chain the vault was
          sealed on. You must be on that network for the key release to succeed.
        </p>
      </div>

      {released ? (
        <div className="space-y-3">
          <div className="alert alert-success">
            <span>
              Decrypted <span className="font-mono">{released.fileName}</span> ({released.bytes.length.toLocaleString()}{" "}
              bytes). Download started automatically.
            </span>
          </div>
          <div className="flex gap-3">
            <button className="btn btn-primary flex-1" onClick={() => download(released)}>
              <ArrowDownTrayIcon className="h-5 w-5" />
              Download Again
            </button>
            <button className="btn btn-ghost" onClick={reset}>
              Done
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary btn-block" onClick={handleRelease} disabled={isReleasing}>
          {isReleasing ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            <>
              <LockOpenIcon className="h-5 w-5" />
              Decrypt &amp; Download
            </>
          )}
        </button>
      )}

      {error && (
        <div className="alert alert-error">
          <ExclamationTriangleIcon className="h-6 w-6" />
          <span className="break-words">{error}</span>
        </div>
      )}
    </div>
  );
};
