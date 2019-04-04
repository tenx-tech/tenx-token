pragma solidity 0.5.4;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";


/**
 * @notice Capped ERC20 token
 * @dev ERC20 token with a token cap on mints, to ensure a 1:1 mint ratio of TENX to PAY.
 */
contract ERC20Capped is ERC20 {
    using SafeMath for uint256;

    uint public cap;
    uint public totalMinted;

    constructor (uint _cap) public {
        require(_cap > 0, "Cap must be above zero.");
        cap = _cap;
        totalMinted = 0;
    }

    /**
    * @notice Modifier to check that an operation does not exceed the token cap.
    * @param _newValue Token mint amount
    */
    modifier capped(uint _newValue) {
        require(totalMinted.add(_newValue) <= cap, "Cannot mint beyond cap.");
        _;
    }

    /**
    * @dev Cannot _mint beyond cap.
    */
    function _mint(address _account, uint _value) internal capped(_value) {
        totalMinted = totalMinted.add(_value);
        super._mint(_account, _value);
    }
}