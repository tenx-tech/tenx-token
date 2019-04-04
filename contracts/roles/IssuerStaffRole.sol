pragma solidity 0.5.4;

import "openzeppelin-solidity/contracts/access/Roles.sol";


// @notice IssuerStaffs are capable of managing over the Issuer contract.
contract IssuerStaffRole {
    using Roles for Roles.Role;

    event IssuerStaffAdded(address indexed account);
    event IssuerStaffRemoved(address indexed account);

    Roles.Role internal _issuerStaffs;

    modifier onlyIssuerStaff() {
        require(isIssuerStaff(msg.sender), "Only IssuerStaffs can execute this function.");
        _;
    }

    constructor() internal {
        _addIssuerStaff(msg.sender);
    }

    function isIssuerStaff(address account) public view returns (bool) {
        return _issuerStaffs.has(account);
    }

    function addIssuerStaff(address account) public onlyIssuerStaff {
        _addIssuerStaff(account);
    }

    function renounceIssuerStaff() public {
        _removeIssuerStaff(msg.sender);
    }

    function _addIssuerStaff(address account) internal {
        _issuerStaffs.add(account);
        emit IssuerStaffAdded(account);
    }

    function _removeIssuerStaff(address account) internal {
        _issuerStaffs.remove(account);
        emit IssuerStaffRemoved(account);
    }
}
