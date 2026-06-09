// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import { IReclaim, ReclaimTypes } from "../IReclaim.sol";

/**
 * @title MockReclaim
 * @notice Test/local stand-in for the deployed Reclaim verifier. Lets us exercise
 * the WhistleblowerRegistry on-chain verification path without a live Reclaim
 * deployment. NOT for production use — it does no real signature checking.
 */
contract MockReclaim is IReclaim {
    bool public shouldPass = true;

    function setShouldPass(bool _shouldPass) external {
        shouldPass = _shouldPass;
    }

    /// @inheritdoc IReclaim
    function verifyProof(ReclaimTypes.Proof memory) external view override {
        require(shouldPass, "MockReclaim: invalid proof");
    }
}
