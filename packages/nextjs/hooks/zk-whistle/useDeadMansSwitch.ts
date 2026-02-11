"use client";

import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

/**
 * React hook for interacting with the DeadMansSwitch smart contract.
 * Wraps Scaffold-ETH 2 contract hooks for typed access to all
 * Dead Man's Switch operations.
 */
export function useDeadMansSwitch(userAddress?: string) {
  // -------------------------------------------------------
  // Write operations
  // -------------------------------------------------------

  const { writeContractAsync: writeDeadMansSwitchAsync, isPending: isWritePending } =
    useScaffoldWriteContract("DeadMansSwitch");

  const createSwitch = async (
    heartbeatInterval: bigint,
    arweaveTxId: string,
    litAccessControlId: string,
    recipient: string,
  ) => {
    return writeDeadMansSwitchAsync({
      functionName: "createSwitch",
      args: [heartbeatInterval, arweaveTxId, litAccessControlId, recipient],
    });
  };

  const checkIn = async () => {
    return writeDeadMansSwitchAsync({
      functionName: "checkIn",
    });
  };

  const deactivateSwitch = async () => {
    return writeDeadMansSwitchAsync({
      functionName: "deactivateSwitch",
    });
  };

  const updateSwitchMetadata = async (arweaveTxId: string, litAccessControlId: string) => {
    return writeDeadMansSwitchAsync({
      functionName: "updateSwitchMetadata",
      args: [arweaveTxId, litAccessControlId],
    });
  };

  // -------------------------------------------------------
  // Read operations
  // -------------------------------------------------------

  const { data: switchDetails, isLoading: isLoadingDetails } = useScaffoldReadContract({
    contractName: "DeadMansSwitch",
    functionName: "getSwitchDetails",
    args: [userAddress],
  });

  const { data: isDeceased, isLoading: isLoadingDeceased } = useScaffoldReadContract({
    contractName: "DeadMansSwitch",
    functionName: "isDeceased",
    args: [userAddress],
  });

  const { data: timeRemaining, isLoading: isLoadingTimeRemaining } = useScaffoldReadContract({
    contractName: "DeadMansSwitch",
    functionName: "timeUntilTrigger",
    args: [userAddress],
  });

  const { data: switchOwnerCount } = useScaffoldReadContract({
    contractName: "DeadMansSwitch",
    functionName: "getSwitchOwnerCount",
  });

  return {
    // Write
    createSwitch,
    checkIn,
    deactivateSwitch,
    updateSwitchMetadata,
    isWritePending,

    // Read
    switchDetails,
    isDeceased,
    timeRemaining,
    switchOwnerCount,
    isLoadingDetails,
    isLoadingDeceased,
    isLoadingTimeRemaining,
  };
}
