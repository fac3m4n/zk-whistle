"use client";

import { useCallback, useState } from "react";
import { isAddress, zeroAddress } from "viem";
import { useAccount } from "wagmi";
import { FileEncryptor } from "~~/components/zk-whistle/vault/FileEncryptor";
import { useDeployedContractInfo, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { useDeadMansSwitch } from "~~/hooks/zk-whistle/useDeadMansSwitch";
import { useIrysUpload } from "~~/hooks/zk-whistle/useIrysUpload";
import { useLitProtocol } from "~~/hooks/zk-whistle/useLitProtocol";
import { bytesToBase64 } from "~~/services/zk-whistle/encryption";
import type { EncryptedPayload, VaultCreationStep, VaultManifest } from "~~/types/zk-whistle";
import { notification } from "~~/utils/scaffold-eth";

const INTERVAL_OPTIONS = [
  { label: "1 Day", value: 86400 },
  { label: "3 Days", value: 259200 },
  { label: "7 Days", value: 604800 },
  { label: "14 Days", value: 1209600 },
  { label: "30 Days", value: 2592000 },
];

const LIT_NETWORK = "naga-dev";

/** SHA-256 of bytes, returned as a short hex digest (for local-preview refs). */
async function shortHash(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .slice(0, 8)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Multi-step vault creation wizard.
 * Pipeline: encrypt file (AES, in FileEncryptor) -> seal AES key with Lit ->
 * upload self-describing manifest to Arweave -> register on-chain.
 */
export const VaultCreationForm = () => {
  const { address } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const { data: deadMansSwitch } = useDeployedContractInfo({ contractName: "DeadMansSwitch" });
  const { createSwitch, isWritePending } = useDeadMansSwitch(address);
  const { encryptKey, buildDeadMansSwitchACC, litChainNameFromId, isLitSupportedChain } = useLitProtocol();
  const { upload, getArweaveUrl } = useIrysUpload();

  const [step, setStep] = useState<VaultCreationStep>("select-file");
  const [encryptedPayload, setEncryptedPayload] = useState<EncryptedPayload | null>(null);
  const [fileName, setFileName] = useState("");
  const [mimeType, setMimeType] = useState("application/octet-stream");
  const [interval, setInterval] = useState(INTERVAL_OPTIONS[2].value); // default 7 days
  const [recipient, setRecipient] = useState("");
  const [progress, setProgress] = useState("");

  const litChain = litChainNameFromId(targetNetwork.id);
  const litEnabled = isLitSupportedChain(litChain) && !!deadMansSwitch?.address;

  const handleEncrypted = useCallback((payload: EncryptedPayload, name: string, type: string) => {
    setEncryptedPayload(payload);
    setFileName(name);
    setMimeType(type || "application/octet-stream");
    setStep("set-conditions");
  }, []);

  const handleRegister = useCallback(async () => {
    if (!encryptedPayload || !address) return;

    if (recipient && !isAddress(recipient)) {
      notification.error("Recipient must be a valid Ethereum address (or left blank for public release).");
      return;
    }
    const recipientAddr = recipient && isAddress(recipient) ? recipient : zeroAddress;

    setStep("register");

    try {
      // 1) Seal the AES key with Lit under the on-chain isDeceased() condition.
      let litSection: VaultManifest["lit"] = null;
      let litRef = "unencrypted-local";

      if (litEnabled && litChain && deadMansSwitch?.address) {
        setProgress("Sealing decryption key with Lit Protocol (MPC)...");
        const acc = buildDeadMansSwitchACC(deadMansSwitch.address, address, litChain);
        const litKey = await encryptKey(encryptedPayload.exportedKey, acc, litChain);
        if (!litKey) {
          throw new Error("Lit Protocol failed to seal the decryption key.");
        }
        litSection = {
          network: LIT_NETWORK,
          chain: litChain,
          ciphertext: litKey.ciphertext,
          dataToEncryptHash: litKey.dataToEncryptHash,
          accessControlConditions: acc,
        };
        litRef = litKey.dataToEncryptHash;
      }

      // 2) Assemble the self-describing manifest (no plaintext ever included).
      const manifest: VaultManifest = {
        version: "1",
        app: "ZK-Whistle",
        encryption: "AES-256-GCM",
        file: { name: fileName, mimeType, size: encryptedPayload.ciphertext.length, encryptedAt: Date.now() },
        payload: {
          iv: bytesToBase64(encryptedPayload.iv),
          ciphertext: bytesToBase64(encryptedPayload.ciphertext),
        },
        lit: litSection,
        recipient: recipientAddr,
      };
      const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest));

      // 3) Persist. Lit-supported chains upload the manifest to Arweave (Turbo,
      //    via the /api/storage route). Local/unsupported chains skip storage and
      //    use a content-hash reference so registration is still demoable.
      let arweaveTxId: string;
      if (litEnabled) {
        setProgress("Uploading encrypted vault to Arweave...");
        arweaveTxId = await upload(manifestBytes, { fileName, mimeType, encryptedAt: Date.now(), version: "1" });
      } else {
        arweaveTxId = `local-preview:${await shortHash(manifestBytes)}`;
      }

      // 4) Register the Dead Man's Switch on-chain.
      setProgress("Registering vault on-chain...");
      await createSwitch(BigInt(interval), arweaveTxId, litRef, recipientAddr);

      notification.success(
        litEnabled
          ? "Vault created. Encrypted payload stored on Arweave and key sealed by Lit. Remember to check in."
          : "Vault registered (local-preview mode — no permanent storage or key escrow). Switch to a Lit-supported network for the full flow.",
      );
      if (litEnabled) {
        notification.info(`Arweave: ${getArweaveUrl(arweaveTxId)}`);
      }

      setStep("select-file");
      setEncryptedPayload(null);
      setFileName("");
      setProgress("");
    } catch (err) {
      notification.error(`Failed to create vault: ${err instanceof Error ? err.message : "Unknown error"}`);
      setProgress("");
      setStep("set-conditions");
    }
  }, [
    encryptedPayload,
    address,
    recipient,
    litEnabled,
    litChain,
    deadMansSwitch?.address,
    buildDeadMansSwitchACC,
    encryptKey,
    fileName,
    mimeType,
    upload,
    getArweaveUrl,
    createSwitch,
    interval,
  ]);

  if (!address) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body items-center text-center">
          <p className="text-base-content/70">Connect your wallet to create a vault.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title mb-4">Create New Vault</h2>

        {/* Progress Steps */}
        <ul className="steps steps-horizontal w-full mb-8">
          <li className="step step-primary">Encrypt File</li>
          <li className={`step ${step === "set-conditions" || step === "register" ? "step-primary" : ""}`}>
            Configure
          </li>
          <li className={`step ${step === "register" ? "step-primary" : ""}`}>Register</li>
        </ul>

        {/* Step: Select & Encrypt File */}
        {step === "select-file" && (
          <div>
            <p className="mb-4 text-base-content/70">
              Select a file to encrypt. All encryption happens in your browser using AES-256-GCM. No plaintext data ever
              leaves your device.
            </p>
            <FileEncryptor onEncrypted={handleEncrypted} />
          </div>
        )}

        {/* Step: Configure Conditions */}
        {step === "set-conditions" && (
          <div className="space-y-6">
            <div className="alert alert-success">
              <span>
                File &quot;{fileName}&quot; encrypted ({(encryptedPayload?.ciphertext.length ?? 0).toLocaleString()}{" "}
                bytes)
              </span>
            </div>

            {/* Network / Lit status */}
            {litEnabled ? (
              <div className="alert alert-info">
                <span>
                  Lit key-gating active on <span className="font-mono">{litChain}</span>. Your decryption key will be
                  sealed by the Lit MPC network and released only when the switch triggers.
                </span>
              </div>
            ) : (
              <div className="alert alert-warning">
                <span>
                  <span className="font-medium">{targetNetwork.name}</span> isn&apos;t a Lit-supported network, so
                  key-gating is disabled. The vault will be created in <span className="font-mono">local-preview</span>{" "}
                  mode (no permanent storage, no key escrow). Switch to Base Sepolia or Sepolia for the full flow.
                </span>
              </div>
            )}

            {/* Heartbeat Interval */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Check-in Interval</span>
                <span className="label-text-alt">How often you must check in</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={interval}
                onChange={e => setInterval(Number(e.target.value))}
              >
                {INTERVAL_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <label className="label">
                <span className="label-text-alt text-warning">
                  If you miss a check-in, your encrypted data becomes accessible.
                </span>
              </label>
            </div>

            {/* Recipient */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Recipient Address (optional)</span>
                <span className="label-text-alt">Leave empty for public release</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full font-mono"
                placeholder="0x... or leave blank for public release"
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
              />
            </div>

            <div className="card-actions justify-between mt-6">
              <button className="btn btn-ghost" onClick={() => setStep("select-file")}>
                Back
              </button>
              <button className="btn btn-primary" onClick={handleRegister} disabled={isWritePending}>
                {isWritePending ? <span className="loading loading-spinner loading-sm"></span> : "Register On-Chain"}
              </button>
            </div>
          </div>
        )}

        {/* Step: Registering */}
        {step === "register" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="font-medium">{progress || "Creating your vault..."}</p>
            <p className="text-sm text-base-content/50">This can take a moment — please confirm any wallet prompts.</p>
          </div>
        )}
      </div>
    </div>
  );
};
