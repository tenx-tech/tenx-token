pragma solidity 0.5.4;

import "../interfaces/IModerator.sol";
import "../lib/Blacklistable.sol";


contract BlacklistModerator is IModerator, Blacklistable {
    byte internal constant STATUS_TRANSFER_FAILURE = 0x50; // Uses status codes from ERC-1066
    byte internal constant STATUS_TRANSFER_SUCCESS = 0x51;

    bytes32 internal constant ALLOWED_APPLICATION_CODE = keccak256("org.tenx.allowed");
    bytes32 internal constant FORBIDDEN_APPLICATION_CODE = keccak256("org.tenx.forbidden");

    function verifyIssue(address _account, uint256, bytes calldata) external view
        returns (bool allowed, byte statusCode, bytes32 applicationCode) 
    {
        if (isAllowed(_account)) {
            allowed = true;
            statusCode = STATUS_TRANSFER_SUCCESS;
            applicationCode = ALLOWED_APPLICATION_CODE;
        } else {
            allowed = false;
            statusCode = STATUS_TRANSFER_FAILURE;
            applicationCode = FORBIDDEN_APPLICATION_CODE;
        }
    }

    function verifyTransfer(address _from, address _to, uint256, bytes calldata) external view 
        returns (bool allowed, byte statusCode, bytes32 applicationCode) 
    {
        if (isAllowed(_from) && isAllowed(_to)) {
            allowed = true;
            statusCode = STATUS_TRANSFER_SUCCESS;
            applicationCode = ALLOWED_APPLICATION_CODE;
        } else {
            allowed = false;
            statusCode = STATUS_TRANSFER_FAILURE;
            applicationCode = FORBIDDEN_APPLICATION_CODE;
        }
    }

    function verifyTransferFrom(address _from, address _to, address _sender, uint256, bytes calldata) external view 
        returns (bool allowed, byte statusCode, bytes32 applicationCode) 
    {
        if (isAllowed(_from) && isAllowed(_to) && isAllowed(_sender)) {
            allowed = true;
            statusCode = STATUS_TRANSFER_SUCCESS;
            applicationCode = ALLOWED_APPLICATION_CODE;
        } else {
            allowed = false;
            statusCode = STATUS_TRANSFER_FAILURE;
            applicationCode = FORBIDDEN_APPLICATION_CODE;
        }
    }

    function verifyRedeem(address _sender, uint256, bytes calldata) external view 
        returns (bool allowed, byte statusCode, bytes32 applicationCode) 
    {
        if (isAllowed(_sender)) {
            allowed = true;
            statusCode = STATUS_TRANSFER_SUCCESS;
            applicationCode = ALLOWED_APPLICATION_CODE;
        } else {
            allowed = false;
            statusCode = STATUS_TRANSFER_FAILURE;
            applicationCode = FORBIDDEN_APPLICATION_CODE;
        }
    }

    function verifyRedeemFrom(address _sender, address _tokenHolder, uint256, bytes calldata) external view 
        returns (bool allowed, byte statusCode, bytes32 applicationCode) 
    {
        if (isAllowed(_sender) && isAllowed(_tokenHolder)) {
            allowed = true;
            statusCode = STATUS_TRANSFER_SUCCESS;
            applicationCode = ALLOWED_APPLICATION_CODE;
        } else {
            allowed = false;
            statusCode = STATUS_TRANSFER_FAILURE;
            applicationCode = FORBIDDEN_APPLICATION_CODE;
        }
    }        

    function verifyControllerTransfer(address, address, address, uint256, bytes calldata, bytes calldata) external view 
        returns (bool allowed, byte statusCode, bytes32 applicationCode) 
    {
        allowed = true;
        statusCode = STATUS_TRANSFER_SUCCESS;
        applicationCode = ALLOWED_APPLICATION_CODE;
    }

    function verifyControllerRedeem(address, address, uint256, bytes calldata, bytes calldata) external view 
        returns (bool allowed, byte statusCode, bytes32 applicationCode) 
    {
        allowed = true;
        statusCode = STATUS_TRANSFER_SUCCESS;
        applicationCode = ALLOWED_APPLICATION_CODE;
    }

    function isAllowed(address _account) internal view returns (bool) {
        return !isBlacklisted[_account];
    }
}