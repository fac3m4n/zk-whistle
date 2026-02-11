import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys the Marketplace contract.
 * The deployer address is used as the initial fee recipient for platform fees (2.5%).
 * Whistleblowers list encrypted information; journalists bid; payments go to stealth addresses.
 */
const deployMarketplace: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("Marketplace", {
    from: deployer,
    args: [deployer],
    log: true,
    autoMine: true,
  });
};

export default deployMarketplace;

deployMarketplace.tags = ["Marketplace"];
