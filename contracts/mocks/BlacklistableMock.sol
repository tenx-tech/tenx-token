pragma solidity 0.5.4;

import "../lib/Blacklistable.sol";


contract BlacklistableMock is Blacklistable {
    function doSomething() public view onlyNotBlacklisted(msg.sender) returns (bool) {
        return true;
    }

    function doSomethingElse() public view onlyBlacklisted(msg.sender) returns (bool) {
        return true;
    }
}