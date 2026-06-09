import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

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
  } else if (process.env.RECLAIM_VERIFIER_ADDRESS) {
    verifier = process.env.RECLAIM_VERIFIER_ADDRESS;
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
