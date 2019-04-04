pragma solidity 0.5.4;

import "../roles/ModeratorRole.sol";


contract Blacklistable is ModeratorRole {
    event Blacklisted(address account);
    event Unblacklisted(address account);

    mapping (address => bool) public isBlacklisted;

    modifier onlyBlacklisted(address account) {
        require(isBlacklisted[account], "Account is not blacklisted.");
        _;
    }

    modifier onlyNotBlacklisted(address account) {
        require(!isBlacklisted[account], "Account is blacklisted.");
        _;
    }

    function blacklist(address account) external onlyModerator {
        require(account != address(0), "Cannot blacklist zero address.");
        require(account != msg.sender, "Cannot blacklist self.");
        require(!isBlacklisted[account], "Address already blacklisted.");
        isBlacklisted[account] = true;
        emit Blacklisted(account);
    }

    function unblacklist(address account) external onlyModerator {
        require(account != address(0), "Cannot unblacklist zero address.");
        require(account != msg.sender, "Cannot unblacklist self.");
        require(isBlacklisted[account], "Address not blacklisted.");
        isBlacklisted[account] = false;
        emit Unblacklisted(account);
    }
}