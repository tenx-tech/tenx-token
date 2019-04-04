pragma solidity 0.5.4;

import "../token/PAYToken.sol";


contract PAYTokenMock is PAYToken {
    function transfer(address, uint256) public {
        revert("Throw");
    }
}
