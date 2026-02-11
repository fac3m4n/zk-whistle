import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys the DeadMansSwitch contract.
 * This contract manages heartbeat-based triggers for encrypted data release
 * via Lit Protocol Access Control Conditions.
 */
const deployDeadMansSwitch: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("DeadMansSwitch", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });
};

export default deployDeadMansSwitch;

deployDeadMansSwitch.tags = ["DeadMansSwitch"];
