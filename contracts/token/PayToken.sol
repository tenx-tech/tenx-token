pragma solidity 0.5.4;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../interfaces/IPAYToken.sol";


/**
 * @notice PAYToken
 * @dev Test PAY token based on actual deployed contract.
 * The real rollout will require calling the real mainnet PAY Token contract.
 */
contract PAYToken is IPAYToken, Ownable {
    using SafeMath for uint;

    string public name = "TenX Pay Token";
    string public symbol = "PAY";
    uint public decimals = 18;

    event Transfer(address indexed from, address indexed to, uint value);
    event Approval(address indexed owner, address indexed spender, uint value);
    event Mint(address indexed to, uint value);

    uint public totalSupply;
    mapping(address => uint) public balances;
    mapping (address => mapping (address => uint)) public allowed;

    modifier onlyPayloadSize(uint size) {
        if (msg.data.length < size + 4) {
            revert("Throws");
        }
        _;
    }    

    function transfer(address _to, uint _value) public onlyPayloadSize(2 * 32) {
        balances[msg.sender] = balances[msg.sender].sub(_value);
        balances[_to] = balances[_to].add(_value);
        emit Transfer(msg.sender, _to, _value);
    }

    function approve(address _spender, uint _value) public {
        if ((_value != 0) && (allowed[msg.sender][_spender] != 0)) revert("Throw");

        allowed[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
    }

    function transferFrom(address _from, address _to, uint _value) public onlyPayloadSize(3 * 32) {
        balances[_to] = balances[_to].add(_value);
        balances[_from] = balances[_from].sub(_value);
        allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_value);
        emit Transfer(_from, _to, _value);
    }

    function mint(address _to, uint _amount) public onlyOwner returns (bool) {
        totalSupply = totalSupply.add(_amount);
        balances[_to] = balances[_to].add(_amount);
        emit Mint(_to, _amount);
        return true;
    }    

    function balanceOf(address _owner) public view returns (uint balance) {
        return balances[_owner];
    }

    function allowance(address _owner, address _spender) public view returns (uint remaining) {
        return allowed[_owner][_spender];
    }    
}
