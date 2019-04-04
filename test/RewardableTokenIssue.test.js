const { assertEvent, expectThrow } = require('./helpers');

const BasicModerator = artifacts.require('BasicModerator');
const RewardableToken = artifacts.require('RewardableToken');
const PAYToken = artifacts.require('PAYToken');
const Rewards = artifacts.require('Rewards');

const TOTAL_SHARES = 200;
const ISSUE_AMOUNT = 100;
const DEPOSIT_AMOUNT = 100;
const EMPTY_BYTES = '0x';

contract('RewardableToken', ([owner, A, B, C, other, staff, rewardsSource]) => {
  before(async () => {
    // Deploys moderator
    this.moderator = await BasicModerator.new();

    // Deploys tokens
    this.rewardableToken = await RewardableToken.new(this.moderator.address, TOTAL_SHARES);
    this.rewardsToken = await PAYToken.new();

    // Deploys rewards
    this.rewards = await Rewards.new(
      this.rewardableToken.address,
      this.rewardsToken.address,
    );

    // Links token and rewards contracts
    await this.rewardableToken.setRewards(this.rewards.address, { from: owner });

    // Test scenario setup
    await this.rewardsToken.mint(rewardsSource, 10000);
    await this.rewardsToken.approve(this.rewards.address, 200, { from: rewardsSource });
    await this.rewards.addRewarder(rewardsSource);

    // Test upgrades
    this.newRewards = await Rewards.new(
      this.rewardableToken.address,
      this.rewardsToken.address,
    );
  });

  it('initializes correctly', async () => {
    const totalRewards = await this.rewards.totalRewards();
    assert.equal(totalRewards, 0);

    const aRewards = await this.rewards.unclaimedRewards(A);
    assert.equal(aRewards, 0);

    const bRewards = await this.rewards.unclaimedRewards(B);
    assert.equal(bRewards, 0);
  });

  it('issue TENX tokens to A, and deposit rewards', async () => {
    await this.rewardableToken.issue(A, ISSUE_AMOUNT, EMPTY_BYTES, { from: owner });

    await this.rewards.deposit(DEPOSIT_AMOUNT, { from: rewardsSource });
    const totalRewards = await this.rewards.totalRewards();
    assert.equal(totalRewards, DEPOSIT_AMOUNT);

    const aBalance = await this.rewardableToken.balanceOf(A);
    assert.equal(aBalance, ISSUE_AMOUNT);

    const bBalance = await this.rewardableToken.balanceOf(B);
    assert.equal(bBalance, 0);

    const aRewards = await this.rewards.unclaimedRewards(A);
    assert.equal(aRewards, 50); // ISSUE_AMOUNT / TOTAL_SHARES * TOTAL_REWARDS

    const bRewards = await this.rewards.unclaimedRewards(B);
    assert.equal(bRewards, 0);
  });

  it('issue TENX tokens to B', async () => {
    await this.rewardableToken.issue(B, ISSUE_AMOUNT, EMPTY_BYTES, { from: owner });

    const totalRewards = await this.rewards.totalRewards();
    assert.equal(totalRewards, DEPOSIT_AMOUNT);

    const aBalance = await this.rewardableToken.balanceOf(A);
    assert.equal(aBalance, ISSUE_AMOUNT);

    const bBalance = await this.rewardableToken.balanceOf(B);
    assert.equal(bBalance, ISSUE_AMOUNT);

    const aRewards = await this.rewards.unclaimedRewards(A);
    assert.equal(aRewards, 50); // ISSUE_AMOUNT / TOTAL_SHARES * TOTAL_REWARDS

    const bRewards = await this.rewards.unclaimedRewards(B);
    assert.equal(bRewards, 50);
  });
});
