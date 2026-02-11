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

  await deploy("WhistleblowerRegistry", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });
};

export default deployWhistleblowerRegistry;

deployWhistleblowerRegistry.tags = ["WhistleblowerRegistry"];
