pragma solidity 0.5.4;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";
import "openzeppelin-solidity/contracts/drafts/SignedSafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "../interfaces/IERC1594Capped.sol";
import "../interfaces/IRewards.sol";
import "../interfaces/IRewardsUpdatable.sol";
import "../interfaces/IRewardable.sol";
import "../roles/RewarderRole.sol";
import "../lib/Whitelistable.sol";


/**
* @notice This contract determines the amount of rewards each user is entitled to and allows users to withdraw their rewards.
* @dev The rewards (in the form of a 'rewardsToken') are calculated based on a percentage ownership of a 'rewardableToken'.
* The rewards calculation takes into account token movements using a 'damping' factor.
* This contract makes use of pull payments over push payments to avoid DoS vulnerabilities.
*/
contract Rewards is IRewards, IRewardsUpdatable, RewarderRole, Pausable, Ownable, ReentrancyGuard, Whitelistable {
    using SafeERC20 for IERC20;
    using SafeMath for uint;
    using SignedSafeMath for int;

    IERC1594Capped private rewardableToken; // Rewardable tokens gives rewards when held.
    IERC20 private rewardsToken; // Rewards tokens are given out as rewards.
    address private rewardsNotifier; // Contract address where token movements are broadcast from.

    bool public isRunning = true;
    uint public maxShares; // Total TENX cap. Constant amount.
    uint public totalRewards; // The current size of the global pool of PAY rewards. Can decrease because of TENX burning.
    uint public totalDepositedRewards; // Total PAY rewards deposited for users so far. Monotonically increasing.
    uint public totalClaimedRewards; // Amount of rewards claimed by users so far. Monotonically increasing.
    mapping(address => int) private _dampings; // Balancing factor to account for rewardable token movements.
    mapping(address => uint) public claimedRewards; // Claimed PAY rewards per user.

    event Deposited(address indexed from, uint amount);
    event Withdrawn(address indexed from, uint amount);
    event Reclaimed(uint amount);
    event NotifierUpdated(address implementation);

    constructor(IERC1594Capped _rewardableToken, IERC20 _rewardsToken) public {
        uint _cap = _rewardableToken.cap();
        require(_cap != 0, "Shares token cap must be non-zero.");
        maxShares = _cap;
        rewardableToken = _rewardableToken;
        rewardsToken = _rewardsToken;
        rewardsNotifier = address(_rewardableToken);
    }

    /**
    * @notice Modifier to check that functions are only callable by a predefined address.
    */   
    modifier onlyRewardsNotifier() {
        require(msg.sender == rewardsNotifier, "Can only be called by the rewards notifier contract.");
        _;
    }

    /**
    * @notice Modifier to check that the Rewards contract is currently running.
    */
    modifier whenRunning() {
        require(isRunning, "Rewards contract has stopped running.");
        _;
    }

    function () external payable { // Ether fallback function
        require(msg.value == 0, "Received non-zero msg.value.");
        withdraw();
    }

    /**
    * Releases a specified amount of rewards to all shares token holders.
    * @dev The rewards each user is allocated to receive is calculated dynamically.
    * Note that the contract needs to hold sufficient rewards token balance to disburse rewards.
    * @param _amount Amount of reward tokens to allocate to token holders.
    */
    function deposit(uint _amount) external onlyRewarder whenRunning whenNotPaused {
        require(_amount != 0, "Deposit amount must non-zero.");
        totalDepositedRewards = totalDepositedRewards.add(_amount);
        totalRewards = totalRewards.add(_amount);
        address from = msg.sender;
        emit Deposited(from, _amount);

        rewardsToken.safeTransferFrom(msg.sender, address(this), _amount); // [External contract call to PAYToken]
    }

    /**
    * @notice Links a RewardsNotifier contract to update this contract on token movements.
    * @param _notifier Contract address.
    */
    function setRewardsNotifier(address _notifier) external onlyOwner {
        require(address(_notifier) != address(0), "Rewards address must not be a zero address.");
        require(Address.isContract(address(_notifier)), "Address must point to a contract.");
        rewardsNotifier = _notifier;
        emit NotifierUpdated(_notifier);
    }

    /**
    * @notice Updates a damping factor to account for token transfers in the dynamic rewards calculation.
    * @dev This function adds +X damping to senders and -X damping to recipients, where X is _dampingChange().
    * This function is called in TENXToken `transfer()` and `transferFrom()`.
    * @param _from Sender address
    * @param _to Recipient address
    * @param _value Token movement amount
    */
    function updateOnTransfer(address _from, address _to, uint _value) external onlyRewardsNotifier nonReentrant returns (bool) {
        int fromUserShareChange = int(_value); // <_from> sends their _value to <_to>, change is positive
        int fromDampingChange = _dampingChange(totalShares(), totalRewards, fromUserShareChange);

        int toUserShareChange = int(_value).mul(-1); // <_to> receives _value from <_from>, change is negative
        int toDampingChange = _dampingChange(totalShares(), totalRewards, toUserShareChange);

        assert((fromDampingChange.add(toDampingChange)) == 0);

        _dampings[_from] = damping(_from).add(fromDampingChange);
        _dampings[_to] = damping(_to).add(toDampingChange);
        return true;
    }

    /**
    * @notice Updates a damping factor to account for token butning in the dynamic rewards calculation.
    * @param _account address
    * @param _value Token burn amount
    */
    function updateOnBurn(address _account, uint _value) external onlyRewardsNotifier nonReentrant returns (bool) { 
        uint totalSharesBeforeBurn = totalShares().add(_value); // In Rewardable.sol, this is executed after the burn has deducted totalShares()
        uint redeemableRewards = _value.mul(totalRewards).div(totalSharesBeforeBurn); // Calculate amount of rewards the burned amount is entitled to
        totalRewards = totalRewards.sub(redeemableRewards); // Remove redeemable rewards from the global pool
        _dampings[_account] = damping(_account).add(int(redeemableRewards)); // Only _account is able to withdraw the unclaimed redeemed rewards
        return true;
    }

    /**
    * @notice Emergency fallback to drain the contract's balance of PAY tokens.
    */
    function reclaimRewards() external onlyOwner {
        uint256 balance = rewardsToken.balanceOf(address(this));
        isRunning = false;
        rewardsToken.safeTransfer(owner(), balance);
        emit Reclaimed(balance);
    }

   /**
    * @notice Withdraw your balance of PAY rewards.
    * @dev Only the unclaimed rewards amount can be withdrawn by a user.
    */
    function withdraw() public whenRunning whenNotPaused onlyWhitelisted(msg.sender) nonReentrant {
        address payee = msg.sender;
        uint unclaimedReward = unclaimedRewards(payee);
        require(unclaimedReward > 0, "Unclaimed reward must be non-zero to withdraw.");
        require(supply() >= unclaimedReward, "Rewards contract must have sufficient PAY to disburse.");

        claimedRewards[payee] = claimedRewards[payee].add(unclaimedReward); // Add amount to claimed rewards balance
        totalClaimedRewards = totalClaimedRewards.add(unclaimedReward);
        emit Withdrawn(payee, unclaimedReward);

        // Send PAY reward to payee
        rewardsToken.safeTransfer(payee, unclaimedReward); // [External contract call]
    }

    /**
    * @notice Returns this contract's current reward token supply.
    * @dev The contract must have sufficient PAY allowance to deposit() rewards.
    * @return Total PAY balance of this contract
    */
    function supply() public view returns (uint) {
        return rewardsToken.balanceOf(address(this));
    }

    /**
    * @notice Returns the reward model's denominator. Used to calculate user rewards.
    * @dev The denominator is = INITIAL TOKEN CAP - TOTAL REWARDABLE TOKENS REDEEMED.
    * @return denominator
    */
    function totalShares() public view returns (uint) {
        uint totalRedeemed = rewardableToken.totalRedeemed();
        return maxShares.sub(totalRedeemed);
    }

    /**
    * @notice Returns the amount of a user's unclaimed (= total allocated - claimed) rewards. 
    * @param _payee User address.
    * @return total unclaimed rewards for user
    */
    function unclaimedRewards(address _payee) public view returns(uint) {
        require(_payee != address(0), "Payee must not be a zero address.");
        uint totalUserReward = totalUserRewards(_payee);
        if (totalUserReward == uint(0)) {
            return 0;
        }

        uint unclaimedReward = totalUserReward.sub(claimedRewards[_payee]);
        return unclaimedReward;
    }

    /**
    * @notice Returns a user's total PAY rewards.
    * @param _payee User address.
    * @return total claimed + unclaimed rewards for user
    */
    function totalUserRewards(address _payee) internal view returns (uint) {
        require(_payee != address(0), "Payee must not be a zero address.");
        uint userShares = rewardableToken.balanceOf(_payee); // [External contract call]
        int userDamping = damping(_payee);
        uint result = _totalUserRewards(totalShares(), totalRewards, userShares, userDamping);
        return result;
    }    

    /**
    * @notice Calculate a user's damping factor change. 
    * @dev The damping factor is used to take into account token movements in the rewards calculation.
    * dampingChange = total PAY rewards * percentage change in a user's TENX shares
    * @param _totalShares Total TENX cap (constant ~200M.)
    * @param _totalRewards The current size of the global pool of PAY rewards.
    * @param _sharesChange The user's change in TENX balance. Can be positive or negative.
    * @return damping change for a given change in tokens
    */
    function _dampingChange(
        uint _totalShares,
        uint _totalRewards,
        int _sharesChange
    ) internal pure returns (int) {
        return int(_totalRewards).mul(_sharesChange).div(int(_totalShares));
    }

    /**
    * @notice Calculates a user's total allocated (claimed + unclaimed) rewards.    
    * @dev The user's total allocated rewards = (percentage of user's TENX shares * total PAY rewards) + user's damping factor
    * @param _totalShares Total TENX cap (constant.)
    * @param _totalRewards Total PAY rewards deposited so far.
    * @param _userShares The user's TENX balance.
    * @param _userDamping The user's damping factor.
    * @return total claimed + unclaimed rewards for user
    */
    function _totalUserRewards(
        uint _totalShares,
        uint _totalRewards,
        uint _userShares,
        int _userDamping
    ) internal pure returns (uint) {
        uint maxUserReward = _userShares.mul(_totalRewards).div(_totalShares);
        int userReward = int(maxUserReward).add(_userDamping);
        uint result = (userReward > 0 ? uint(userReward) : 0);
        return result;
    }

    function damping(address account) internal view returns (int) {
        return _dampings[account];
    }
}
