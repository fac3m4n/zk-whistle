import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys the WhistleblowerRegistry contract.
 * This contract stores hashes of Reclaim Protocol zkTLS proofs on-chain
 * to establish whistleblower credibility without revealing identity.
 */
const deployWhistleblowerRegistry: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // autoVerifyOnSubmit = true for local/dev convenience. Disable in production and
  // rely on attestVerification() once a real Reclaim proof validator is in place.
  await deploy("WhistleblowerRegistry", {
    from: deployer,
    args: [true],
    log: true,
    autoMine: true,
  });
};

export default deployWhistleblowerRegistry;

deployWhistleblowerRegistry.tags = ["WhistleblowerRegistry"];
