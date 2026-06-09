import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deployed Reclaim verifier addresses by chainId.
 * Source: Reclaim official docs https://docs.reclaimprotocol.org/onchain/solidity/supported-networks
 * Base Sepolia (84532) additionally verified on-chain via eth_getCode (has contract code).
 * Override any entry with the RECLAIM_VERIFIER_ADDRESS env var.
 */
const RECLAIM_VERIFIERS: Record<string, string> = {
  "84532": "0xF90085f5Fd1a3bEb8678623409b3811eCeC5f6A5", // Base Sepolia
  "8453": "0x8CDc031d5B7F148ab0435028B16c682c469CEfC3", // Base mainnet
};

/**
 * Deploys the WhistleblowerRegistry contract.
 * This contract stores hashes of Reclaim Protocol zkTLS proofs on-chain
 * to establish whistleblower credibility without revealing identity.
 *
 * Verification wiring:
 *  - autoVerifyOnSubmit defaults to TRUE on local dev chains (convenience) and
 *    FALSE on live networks, where verification should be cryptographic.
 *  - The Reclaim verifier is set to the local MockReclaim on Hardhat, or to
 *    RECLAIM_VERIFIER_ADDRESS (the real deployed Reclaim verifier for the chain)
 *    when provided. With a verifier set, submitVerifiedProof() gives `isVerified`
 *    real meaning regardless of autoVerifyOnSubmit.
 */
const deployWhistleblowerRegistry: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, execute, get, log } = hre.deployments;

  const chainId = await hre.getChainId();
  const isLocal = chainId === "31337";

  await deploy("WhistleblowerRegistry", {
    from: deployer,
    args: [isLocal], // autoVerifyOnSubmit: dev-only convenience
    log: true,
    autoMine: true,
  });

  // Resolve a Reclaim verifier address for this network.
  let verifier: string | undefined;
  if (isLocal) {
    try {
      verifier = (await get("MockReclaim")).address;
    } catch {
      verifier = undefined;
    }
  } else {
    // Explicit env override wins; otherwise fall back to the known per-chain address.
    verifier = process.env.RECLAIM_VERIFIER_ADDRESS || RECLAIM_VERIFIERS[chainId];
  }

  if (verifier) {
    await execute("WhistleblowerRegistry", { from: deployer, log: true }, "setReclaimVerifier", verifier);
  } else {
    log(
      "WhistleblowerRegistry: no Reclaim verifier configured. On-chain proof verification disabled " +
        "(set RECLAIM_VERIFIER_ADDRESS to enable submitVerifiedProof on this network).",
    );
  }
};

export default deployWhistleblowerRegistry;

deployWhistleblowerRegistry.tags = ["WhistleblowerRegistry"];
deployWhistleblowerRegistry.dependencies = ["MockReclaim"];
