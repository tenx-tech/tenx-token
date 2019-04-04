const { assertEvent } = require('./helpers');

const BasicModerator = artifacts.require('BasicModerator');
const RewardableToken = artifacts.require('RewardableToken');
const PAYToken = artifacts.require('PAYToken');
const IERC20 = artifacts.require('IERC20');
const Rewards = artifacts.require('Rewards');

const TOTAL_SHARES = 200;
const DEPOSIT_AMOUNT = 100;
const TEST_BYTES = '0x341f85f5eca6304166fcfb6f591d49f6019f23fa39be0615e6417da06bf747ce'; // bytes

contract('Rewards: Reserved Rewards for Extended Claim Window', ([owner, A, B, rewardsSource]) => {
  before(async () => {
    // Deploys moderator
    this.moderator = await BasicModerator.new();

    // Deploys tokens
    this.rewardableToken = await RewardableToken.new(this.moderator.address, TOTAL_SHARES);
    this.payToken = await PAYToken.new();
    this.rewardsToken = await IERC20.at(this.payToken.address);

    // Deploys rewards
    this.rewards = await Rewards.new(
      this.rewardableToken.address,
      this.rewardsToken.address,
    );
    await this.rewards.whitelist(A);

    // Links token and rewards contracts
    await this.rewardableToken.setRewards(this.rewards.address, { from: owner });

    // Top up rewardsSource balance
    await this.payToken.mint(rewardsSource, 10000);
    await this.rewards.addRewarder(rewardsSource);

    // Set up test scenario
    await this.rewardableToken.issue(A, 100, TEST_BYTES); // Issue for A
  });

  it('rewarder should be able to deposit with sufficient allowance from rewardsSource', async () => {
    await this.rewardsToken.approve(this.rewards.address, 10000, { from: rewardsSource });
    const result = await this.rewards.deposit(DEPOSIT_AMOUNT, { from: rewardsSource });
    assertEvent(result, {
      event: 'Deposited',
      args: {
        from: rewardsSource,
        amount: DEPOSIT_AMOUNT,
      },
    }, 'A Deposited event is emitted.');

    const totalRewards = await this.rewards.totalRewards();
    assert.equal(totalRewards.toNumber(), DEPOSIT_AMOUNT);

    const ARewards = await this.rewards.unclaimedRewards(A);
    assert.equal(ARewards.toNumber(), 50);

    const BRewards = await this.rewards.unclaimedRewards(B);
    assert.equal(BRewards.toNumber(), 0); // Has no rewards because no tokens
  });

  it('newly issued tokens are allocated past rewards as well', async () => {
    await this.rewardableToken.issue(B, 100, TEST_BYTES);

    const BRewards = await this.rewards.unclaimedRewards(B);
    assert.equal(BRewards.toNumber(), 50); // Receives past rewards
  });
});
