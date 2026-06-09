// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

/**
 * @title Reclaim Protocol on-chain types & verifier interface
 * @notice Mirrors the structs of `@reclaimprotocol/verifier-solidity-sdk`
 * (Claims.sol / Reclaim.sol) so this project can call a deployed Reclaim
 * verifier without vendoring its full source. The field ORDER is what matters
 * for ABI encoding and must match the canonical SDK exactly. The JS SDK's
 * `transformForOnchain(proof)` produces objects in this exact shape.
 * @dev We delegate cryptographic verification to Reclaim's audited verifier
 * rather than re-implementing witness-signature checks here.
 */
library ReclaimTypes {
    struct ClaimInfo {
        string provider;
        string parameters;
        string context;
    }

    struct CompleteClaimData {
        bytes32 identifier;
        address owner;
        uint32 timestampS;
        uint32 epoch;
    }

    struct SignedClaim {
        CompleteClaimData claim;
        bytes[] signatures;
    }

    struct Proof {
        ClaimInfo claimInfo;
        SignedClaim signedClaim;
    }
}

/**
 * @notice Minimal interface for the deployed Reclaim verifier contract.
 * @dev Declared non-view so callers issue a regular CALL; the real
 * implementation is `view` and reverts when a proof's witness signatures are
 * invalid or below threshold.
 */
interface IReclaim {
    function verifyProof(ReclaimTypes.Proof memory proof) external;
}
