import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys the Marketplace contract.
 * The deployer address is used as the initial fee recipient for platform fees (2.5%).
 * The Marketplace reads verified status from the WhistleblowerRegistry, so that
 * deployment must run first (see hardhat-deploy dependency below).
 * Whistleblowers list encrypted information; journalists bid; payments go to stealth addresses.
 */
const deployMarketplace: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, get } = hre.deployments;

  const registry = await get("WhistleblowerRegistry");

  await deploy("Marketplace", {
    from: deployer,
    args: [deployer, registry.address],
    log: true,
    autoMine: true,
  });
};

export default deployMarketplace;

deployMarketplace.tags = ["Marketplace"];
deployMarketplace.dependencies = ["WhistleblowerRegistry"];
