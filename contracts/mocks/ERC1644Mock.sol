pragma solidity 0.5.4;

import "../token/ERC1644.sol";
import "../interfaces/IModerator.sol"; 


contract ERC1644Mock is ERC1644 {
    constructor (IModerator _moderator, uint256 _initialBalance) public Moderated(_moderator) {
        _mint(msg.sender, _initialBalance);
    }

    function mint(address _account, uint256 _amount) public {
        _mint(_account, _amount);
    }
}
