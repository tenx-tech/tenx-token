pragma solidity 0.5.4;

import "../interfaces/IModerator.sol";
import "../roles/ModeratorRole.sol";


contract BasicModerator is IModerator, ModeratorRole {
    byte internal constant STATUS_TRANSFER_SUCCESS = 0x51; // Uses status codes from ERC-1066
    bytes32 internal constant SUCCESS_APPLICATION_CODE = "";

    /**
    * @notice Verify if an issuance is allowed
    * @dev All issues are allowed by this basic moderator contract
    * @return {
        "allowed": "Returns true if issue is allowed, returns false otherwise.",
        "statusCode": "ERC1066 status code",
        "applicationCode": "Application-specific return code"
    }
    */
    function verifyIssue(address, uint256, bytes calldata) external view
        returns (bool allowed, byte statusCode, bytes32 applicationCode) 
    {
        allowed = true;
        statusCode = STATUS_TRANSFER_SUCCESS;
        applicationCode = SUCCESS_APPLICATION_CODE;
    }

    /**
    * @notice Verify if a transfer is allowed.
    * @dev All transfers are allowed by this basic moderator contract
    * @return {
        "allowed": "Returns true if transfer is allowed, returns false otherwise.",
        "statusCode": "ERC1066 status code",
        "applicationCode": "Application-specific return code"
    }    
    */
    function verifyTransfer(address, address, uint256, bytes calldata) external view 
        returns (bool allowed, byte statusCode, bytes32 applicationCode) 
    {
        allowed = true;
        statusCode = STATUS_TRANSFER_SUCCESS;
        applicationCode = SUCCESS_APPLICATION_CODE;
    }

    /**
    * @notice Verify if a transferFrom is allowed.
    * @dev All transferFroms are allowed by this basic moderator contract
    * @return {
        "allowed": "Returns true if transferFrom is allowed, returns false otherwise.",
        "statusCode": "ERC1066 status code",
        "applicationCode": "Application-specific return code"
    }
    */
    function verifyTransferFrom(address, address, address, uint256, bytes calldata) external view 
        returns (bool allowed, byte statusCode, bytes32 applicationCode) 
    {
        allowed = true;
        statusCode = STATUS_TRANSFER_SUCCESS;
        applicationCode = SUCCESS_APPLICATION_CODE;
    }

    /**
    * @notice Verify if a redeem is allowed.
    * @dev All redeems are allowed by this basic moderator contract
    * @return {
        "allowed": "Returns true if redeem is allowed, returns false otherwise.",
        "statusCode": "ERC1066 status code",
        "applicationCode": "Application-specific return code"
    }
    */
    function verifyRedeem(address, uint256, bytes calldata) external view 
        returns (bool allowed, byte statusCode, bytes32 applicationCode) 
    {
        allowed = true;
        statusCode = STATUS_TRANSFER_SUCCESS;
        applicationCode = SUCCESS_APPLICATION_CODE;
    }

    /**
    * @notice Verify if a redeemFrom is allowed.
    * @dev All redeemFroms are allowed by this basic moderator contract
    * @return {
        "allowed": "Returns true if redeem is allowed, returns false otherwise.",
        "statusCode": "ERC1066 status code",
        "applicationCode": "Application-specific return code"
    }
    */
    function verifyRedeemFrom(address, address, uint256, bytes calldata) external view 
        returns (bool allowed, byte statusCode, bytes32 applicationCode) 
    {
        allowed = true;
        statusCode = STATUS_TRANSFER_SUCCESS;
        applicationCode = SUCCESS_APPLICATION_CODE;
    }   

    /**
    * @notice Verify if a controllerTransfer is allowed.
    * @dev All controllerTransfers are allowed by this basic moderator contract
    * @return {
        "allowed": "Returns true if transfer is allowed, returns false otherwise.",
        "statusCode": "ERC1066 status code",
        "applicationCode": "Application-specific return code"
    }    
    */
    function verifyControllerTransfer(address, address, address, uint256, bytes calldata, bytes calldata) external view 
        returns (bool allowed, byte statusCode, bytes32 applicationCode) 
    {
        allowed = true;
        statusCode = STATUS_TRANSFER_SUCCESS;
        applicationCode = SUCCESS_APPLICATION_CODE;
    }

    /**
    * @notice Verify if a controllerRedeem is allowed.
    * @dev All controllerRedeems are allowed by this basic moderator contract
    * @return {
        "allowed": "Returns true if transfer is allowed, returns false otherwise.",
        "statusCode": "ERC1066 status code",
        "applicationCode": "Application-specific return code"
    }    
    */
    function verifyControllerRedeem(address, address, uint256, bytes calldata, bytes calldata) external view 
        returns (bool allowed, byte statusCode, bytes32 applicationCode) 
    {
        allowed = true;
        statusCode = STATUS_TRANSFER_SUCCESS;
        applicationCode = SUCCESS_APPLICATION_CODE;
    }
}