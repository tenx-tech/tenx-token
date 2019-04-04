pragma solidity 0.5.4;

import "../roles/ModeratorRole.sol";


contract Whitelistable is ModeratorRole {
    event Whitelisted(address account);
    event Unwhitelisted(address account);

    mapping (address => bool) public isWhitelisted;

    modifier onlyWhitelisted(address account) {
        require(isWhitelisted[account], "Account is not whitelisted.");
        _;
    }

    modifier onlyNotWhitelisted(address account) {
        require(!isWhitelisted[account], "Account is whitelisted.");
        _;
    }

    function whitelist(address account) external onlyModerator {
        require(account != address(0), "Cannot whitelist zero address.");
        require(account != msg.sender, "Cannot whitelist self.");
        require(!isWhitelisted[account], "Address already whitelisted.");
        isWhitelisted[account] = true;
        emit Whitelisted(account);
    }

    function unwhitelist(address account) external onlyModerator {
        require(account != address(0), "Cannot unwhitelist zero address.");
        require(account != msg.sender, "Cannot unwhitelist self.");
        require(isWhitelisted[account], "Address not whitelisted.");
        isWhitelisted[account] = false;
        emit Unwhitelisted(account);
    }
}