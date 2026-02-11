"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { BuildingStorefrontIcon, FingerPrintIcon, LockClosedIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();

  return (
    <>
      <div className="flex items-center flex-col grow pt-10">
        <div className="px-5 w-full max-w-4xl">
          <div className="text-center mb-10">
            <h1 className="text-5xl font-bold mb-4">ZK-Whistle</h1>
            <p className="text-xl text-base-content/70 max-w-2xl mx-auto">
              A decentralized whistleblower platform with Dead Man&apos;s Switch, anonymous identity verification, and
              an encrypted information marketplace.
            </p>
            {!connectedAddress && (
              <div className="alert alert-info mt-6 max-w-md mx-auto">
                <ShieldCheckIcon className="h-6 w-6" />
                <span>Connect your wallet to get started.</span>
              </div>
            )}
          </div>

          {/* Module Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Vault Card */}
            <Link href="/vault" className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
              <div className="card-body items-center text-center">
                <LockClosedIcon className="h-12 w-12 text-primary mb-2" />
                <h2 className="card-title">The Vault</h2>
                <p className="text-base-content/70 text-sm">
                  Set up a Dead Man&apos;s Switch. Encrypt files client-side, store them permanently on Arweave, and
                  configure automatic release via Lit Protocol if you stop checking in.
                </p>
                <div className="card-actions mt-4">
                  <div className="btn btn-primary btn-sm">Manage Vault</div>
                </div>
              </div>
            </Link>

            {/* Identity Card */}
            <Link href="/identity" className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
              <div className="card-body items-center text-center">
                <FingerPrintIcon className="h-12 w-12 text-secondary mb-2" />
                <h2 className="card-title">Identity</h2>
                <p className="text-base-content/70 text-sm">
                  Prove your credibility without revealing who you are. Use Reclaim Protocol (zkTLS) to verify
                  employment, credentials, or account ownership with zero-knowledge proofs.
                </p>
                <div className="card-actions mt-4">
                  <div className="btn btn-secondary btn-sm">Verify Identity</div>
                </div>
              </div>
            </Link>

            {/* Marketplace Card */}
            <Link href="/marketplace" className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
              <div className="card-body items-center text-center">
                <BuildingStorefrontIcon className="h-12 w-12 text-accent mb-2" />
                <h2 className="card-title">Marketplace</h2>
                <p className="text-base-content/70 text-sm">
                  Anonymous information exchange. Whistleblowers list encrypted data; journalists bid. Payments use
                  stealth addresses (ERC-5564) for complete unlinkability.
                </p>
                <div className="card-actions mt-4">
                  <div className="btn btn-accent btn-sm">Browse Market</div>
                </div>
              </div>
            </Link>
          </div>

          {/* How It Works Section */}
          <div className="bg-base-200 rounded-3xl p-8 mb-12">
            <h2 className="text-2xl font-bold text-center mb-6">How It Works</h2>
            <ul className="steps steps-vertical lg:steps-horizontal w-full">
              <li className="step step-primary">
                <span className="text-sm">Encrypt files in-browser</span>
              </li>
              <li className="step step-primary">
                <span className="text-sm">Store on Arweave permanently</span>
              </li>
              <li className="step step-primary">
                <span className="text-sm">Lock key with Lit Protocol</span>
              </li>
              <li className="step step-primary">
                <span className="text-sm">Check in periodically</span>
              </li>
              <li className="step">
                <span className="text-sm">Auto-release if silent</span>
              </li>
            </ul>
          </div>

          {/* Security Promise */}
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold mb-3">Privacy by Design</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-base-content/70">
              <div className="flex flex-col items-center gap-1">
                <span className="font-mono text-primary">AES-256-GCM</span>
                <span>Client-side encryption</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="font-mono text-primary">MPC/TSS</span>
                <span>No single key holder</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="font-mono text-primary">zkTLS</span>
                <span>Anonymous credentials</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="font-mono text-primary">ERC-5564</span>
                <span>Stealth payments</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
