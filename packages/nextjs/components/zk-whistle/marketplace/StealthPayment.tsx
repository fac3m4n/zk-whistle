"use client";

import { useCallback, useState } from "react";
import { useStealthAddress } from "~~/hooks/zk-whistle/useStealthAddress";
import { notification } from "~~/utils/scaffold-eth";

type StealthPaymentProps = {
  onAddressGenerated: (stealthAddress: string) => void;
  recipientMetaAddress?: string;
  mode: "generate" | "derive";
};

/**
 * Stealth payment component.
 * - "generate" mode: Whistleblower generates keys and publishes meta-address
 * - "derive" mode: Journalist derives a stealth address for payment
 */
export const StealthPayment = ({ onAddressGenerated, recipientMetaAddress, mode }: StealthPaymentProps) => {
  const { generateKeys, deriveAddress, keyPair, serializedMetaAddress, error } = useStealthAddress();
  const [derivedAddress, setDerivedAddress] = useState<string | null>(null);

  const handleGenerate = useCallback(() => {
    try {
      generateKeys();
      notification.success("Stealth keys generated! Save your private keys securely.");
    } catch {
      notification.error("Key generation failed");
    }
  }, [generateKeys]);

  const handleDerive = useCallback(() => {
    if (!recipientMetaAddress) {
      notification.error("No recipient meta-address provided");
      return;
    }

    const payment = deriveAddress(recipientMetaAddress);
    if (payment) {
      setDerivedAddress(payment.stealthAddress);
      onAddressGenerated(payment.stealthAddress);
      notification.success("Stealth address derived for anonymous payment");
    }
  }, [recipientMetaAddress, deriveAddress, onAddressGenerated]);

  if (mode === "generate") {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold">Generate Stealth Keys</h3>
        <p className="text-sm text-base-content/70">
          Generate an ERC-5564 stealth meta-address. Share the meta-address publicly so journalists can pay you
          anonymously.
        </p>

        {!keyPair ? (
          <button className="btn btn-secondary btn-block" onClick={handleGenerate}>
            Generate Stealth Keys
          </button>
        ) : (
          <div className="space-y-3">
            <div className="bg-base-200 rounded-xl p-4">
              <p className="text-xs font-medium mb-1 text-success">Meta-Address (share publicly):</p>
              <p className="font-mono text-xs break-all">{serializedMetaAddress}</p>
            </div>

            <div className="bg-error/10 rounded-xl p-4 border border-error/20">
              <p className="text-xs font-medium mb-1 text-error">Private Keys (SAVE SECURELY - shown once):</p>
              <div className="space-y-1">
                <p className="font-mono text-xs break-all">Spending: {keyPair.spendingPrivateKey}</p>
                <p className="font-mono text-xs break-all">Viewing: {keyPair.viewingPrivateKey}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  // Derive mode (journalist)
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Derive Stealth Address</h3>
      <p className="text-sm text-base-content/70">
        Derive a one-time stealth address to pay the whistleblower anonymously.
      </p>

      {!derivedAddress ? (
        <button className="btn btn-primary btn-block" onClick={handleDerive} disabled={!recipientMetaAddress}>
          Derive Stealth Address
        </button>
      ) : (
        <div className="bg-base-200 rounded-xl p-4">
          <p className="text-xs font-medium mb-1">Stealth Address:</p>
          <p className="font-mono text-sm break-all">{derivedAddress}</p>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
