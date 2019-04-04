pragma solidity 0.5.4;

import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IIssuer.sol";
import "../interfaces/IERC1594.sol";
import "../interfaces/IHasIssuership.sol";
import "../roles/IssuerStaffRole.sol";


/**
 * @notice The Issuer issues claims for TENX tokens which users can claim to receive tokens.
 */
contract Issuer is IIssuer, IHasIssuership, IssuerStaffRole, Ownable, Pausable, ReentrancyGuard {
    struct Claim {
        address issuer;
        ClaimState status;
        uint amount;
    }

    enum ClaimState { NONE, ISSUED, CLAIMED }
    mapping(address => Claim) public claims;

    bool public isRunning = true;
    IERC1594 public token; // Mints tokens to payee's address

    event Issued(address indexed payee, address indexed issuer, uint amount);
    event Claimed(address indexed payee, uint amount);

    /**
    * @notice Modifier to check that the Issuer contract is currently running.
    */
    modifier whenRunning() {
        require(isRunning, "Issuer contract has stopped running.");
        _;
    }    

    /**
    * @notice Modifier to check the status of a claim.
    * @param _payee Payee address
    * @param _state Claim status    
    */
    modifier atState(address _payee, ClaimState _state) {
        Claim storage c = claims[_payee];
        require(c.status == _state, "Invalid claim source state.");
        _;
    }

    /**
    * @notice Modifier to check the status of a claim.
    * @param _payee Payee address
    * @param _state Claim status
    */
    modifier notAtState(address _payee, ClaimState _state) {
        Claim storage c = claims[_payee];
        require(c.status != _state, "Invalid claim source state.");
        _;
    }

    constructor(IERC1594 _token) public {
        token = _token;
    }

    /**
     * @notice Transfer the token's Issuer role from this contract to another address. Decommissions this Issuer contract.
     */
    function transferIssuership(address _newIssuer) 
        external onlyOwner whenRunning 
    {
        require(_newIssuer != address(0), "New Issuer cannot be zero address.");
        isRunning = false;
        IHasIssuership t = IHasIssuership(address(token));
        t.transferIssuership(_newIssuer);
    }

    /**
    * @notice Issue a new claim.
    * @param _payee The address of the _payee.
    * @param _amount The amount of tokens the payee will receive.
    */
    function issue(address _payee, uint _amount) 
        external onlyIssuerStaff whenRunning whenNotPaused notAtState(_payee, ClaimState.CLAIMED) 
    {
        require(_payee != address(0), "Payee must not be a zero address.");
        require(_payee != msg.sender, "Issuers cannot issue for themselves");
        require(_amount > 0, "Claim amount must be positive.");
        claims[_payee] = Claim({
            status: ClaimState.ISSUED,
            amount: _amount,
            issuer: msg.sender
        });
        emit Issued(_payee, msg.sender, _amount);
    }

    /**
    * @notice Function for users to redeem a claim of tokens.
    * @dev To claim, users must call this contract from their claim address. Tokens equal to the claim amount will be minted to the claim address.
    */
    function claim() 
        external whenRunning whenNotPaused atState(msg.sender, ClaimState.ISSUED) 
    {
        address payee = msg.sender;
        Claim storage c = claims[payee];
        c.status = ClaimState.CLAIMED; // Marks claim as claimed
        emit Claimed(payee, c.amount);

        token.issue(payee, c.amount, ""); // Mints tokens to payee's address
    }

    /**
    * @notice Function to mint tokens to users directly in a single step. Skips the issued state.
    * @param _payee The address of the _payee.
    * @param _amount The amount of tokens the payee will receive.    
    */
    function airdrop(address _payee, uint _amount) 
        external onlyIssuerStaff whenRunning whenNotPaused atState(_payee, ClaimState.NONE) nonReentrant 
    {
        require(_payee != address(0), "Payee must not be a zero address.");
        require(_payee != msg.sender, "Issuers cannot airdrop for themselves");
        require(_amount > 0, "Claim amount must be positive.");
        claims[_payee] = Claim({
            status: ClaimState.CLAIMED,
            amount: _amount,
            issuer: msg.sender
        });
        emit Claimed(_payee, _amount);

        token.issue(_payee, _amount, ""); // Mints tokens to payee's address
    }
}
