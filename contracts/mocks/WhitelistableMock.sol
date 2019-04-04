pragma solidity 0.5.4;

import "../lib/Whitelistable.sol";


contract WhitelistableMock is Whitelistable {
    function doSomething() public view onlyNotWhitelisted(msg.sender) returns (bool) {
        return true;
    }

    function doSomethingElse() public view onlyWhitelisted(msg.sender) returns (bool) {
        return true;
    }
}