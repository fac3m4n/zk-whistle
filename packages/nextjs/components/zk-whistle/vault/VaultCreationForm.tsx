"use client";

import { useCallback, useState } from "react";
import { useAccount } from "wagmi";
import { FileEncryptor } from "~~/components/zk-whistle/vault/FileEncryptor";
import { useDeadMansSwitch } from "~~/hooks/zk-whistle/useDeadMansSwitch";
import type { EncryptedPayload, VaultCreationStep } from "~~/types/zk-whistle";
import { notification } from "~~/utils/scaffold-eth";

const INTERVAL_OPTIONS = [
  { label: "1 Day", value: 86400 },
  { label: "3 Days", value: 259200 },
  { label: "7 Days", value: 604800 },
  { label: "14 Days", value: 1209600 },
  { label: "30 Days", value: 2592000 },
];

/**
 * Multi-step vault creation wizard.
 * Steps: Select File -> Encrypt -> Configure -> Register On-Chain
 */
export const VaultCreationForm = () => {
  const { address } = useAccount();
  const { createSwitch, isWritePending } = useDeadMansSwitch(address);

  const [step, setStep] = useState<VaultCreationStep>("select-file");
  const [encryptedPayload, setEncryptedPayload] = useState<EncryptedPayload | null>(null);
  const [fileName, setFileName] = useState("");
  const [interval, setInterval] = useState(INTERVAL_OPTIONS[2].value); // default 7 days
  const [recipient, setRecipient] = useState("");

  const handleEncrypted = useCallback((payload: EncryptedPayload, name: string) => {
    setEncryptedPayload(payload);
    setFileName(name);
    setStep("set-conditions");
  }, []);

  const handleRegister = useCallback(async () => {
    if (!encryptedPayload) return;

    setStep("register");

    try {
      // For MVP, we store a placeholder for arweave TX and lit ACC IDs.
      // In production, these would come from the Irys upload and Lit encrypt steps.
      const arweaveTxId = `pending_${Date.now()}`;
      const litAccessControlId = `pending_${Date.now()}`;
      const recipientAddr = recipient || "0x0000000000000000000000000000000000000000";

      await createSwitch(BigInt(interval), arweaveTxId, litAccessControlId, recipientAddr);

      notification.success("Vault created successfully! Remember to check in regularly.");
      setStep("select-file");
      setEncryptedPayload(null);
      setFileName("");
    } catch (err) {
      notification.error(`Failed to create vault: ${err instanceof Error ? err.message : "Unknown error"}`);
      setStep("set-conditions");
    }
  }, [encryptedPayload, interval, recipient, createSwitch]);

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
            <p className="font-medium">Registering your vault on-chain...</p>
            <p className="text-sm text-base-content/50">Please confirm the transaction in your wallet.</p>
          </div>
        )}
      </div>
    </div>
  );
};
