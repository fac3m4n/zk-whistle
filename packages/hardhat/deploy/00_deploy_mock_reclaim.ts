import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys a MockReclaim verifier — local/dev chains only.
 * On live networks the real deployed Reclaim verifier is used instead (wired via
 * RECLAIM_VERIFIER_ADDRESS in the WhistleblowerRegistry deploy script).
 */
const deployMockReclaim: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const chainId = await hre.getChainId();
  if (chainId !== "31337") return; // local Hardhat / localhost only

  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("MockReclaim", {
    from: deployer,
    log: true,
    autoMine: true,
  });
};

export default deployMockReclaim;

deployMockReclaim.tags = ["MockReclaim"];
