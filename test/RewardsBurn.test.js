// const { assertEvent, expectThrow } = require('./helpers');

const BasicModerator = artifacts.require('BasicModerator');
const RewardableToken = artifacts.require('RewardableToken');
const PAYToken = artifacts.require('PAYToken');
const Rewards = artifacts.require('Rewards');

const MAX_SHARES = 100;
const DEPOSIT_AMOUNT = 10;
const TEST_BYTES = '0x341f85f5eca6304166fcfb6f591d49f6019f23fa39be0615e6417da06bf747ce'; // bytes

contract('Rewards with burning', ([owner, A, B, C, rewardsSource]) => {
  before(async () => {
    // Deploys moderator
    this.moderator = await BasicModerator.new();

    // Deploys tokens
    this.rewardableToken = await RewardableToken.new(this.moderator.address, MAX_SHARES);
    this.rewardsToken = await PAYToken.new();

    // Deploys rewards
    this.rewards = await Rewards.new(
      this.rewardableToken.address,
      this.rewardsToken.address,
    );

    // Links token and rewards contracts
    await this.rewardableToken.setRewards(this.rewards.address, { from: owner });

    // Top up rewardsSource balance
    await this.rewardsToken.mint(rewardsSource, 1000000);
    await this.rewardsToken.approve(this.rewards.address, 1000000, { from: rewardsSource });
    await this.rewards.addRewarder(rewardsSource);

    // Set up test scenario
    await this.rewardableToken.issue(A, 20, TEST_BYTES); // A has 50/200 shares
    await this.rewardableToken.issue(B, 30, TEST_BYTES); // B has 50/200 shares
  });

  it('should initialize correctly', async () => {
    const isRewarder = await this.rewards.isRewarder(owner);
    assert.equal(isRewarder, true);

    const totalRewards = await this.rewards.totalRewards();
    assert.equal(totalRewards, 0);

    const ARewards = await this.rewards.unclaimedRewards(A);
    assert.equal(ARewards, 0);

    const BRewards = await this.rewards.unclaimedRewards(B);
    assert.equal(BRewards, 0);

    const isRunning = await this.rewards.isRunning();
    assert.equal(isRunning, true);

    const maxShares = await this.rewards.maxShares();
    assert.equal(maxShares, MAX_SHARES);

    const totalRedeemed = await this.rewardableToken.totalRedeemed();
    assert.equal(totalRedeemed, 0);

    const totalShares = await this.rewards.totalShares();
    assert.equal(totalShares, MAX_SHARES); // maxShares - totalRedeemed
  });

  it('rewarder should be able to deposit rewards', async () => {
    await this.rewards.deposit(DEPOSIT_AMOUNT, { from: rewardsSource });

    const totalRewards = await this.rewards.totalRewards();
    assert.equal(totalRewards, DEPOSIT_AMOUNT);

    const ARewards = await this.rewards.unclaimedRewards(A);
    assert.equal(ARewards, 2); // 50/200 * DEPOSIT_AMOUNT

    const BRewards = await this.rewards.unclaimedRewards(B);
    assert.equal(BRewards, 3); // 50/200 * DEPOSIT_AMOUNT
  });

  it('burning unclaimed tokens increases rewards for claimed token holders', async () => {
    await this.rewardableToken.issue(C, 50, TEST_BYTES);

    const CBalance = await this.rewardableToken.balanceOf(C);
    assert.equal(CBalance, 50); // issued amount

    const CRewards = await this.rewards.unclaimedRewards(C);
    assert.equal(CRewards, 5); // 100/200 * TOTAL_REWARDS

    const redeemedAmount = 50;
    // C removes 50% of totalShares from circulation
    await this.rewardableToken.redeem(redeemedAmount, TEST_BYTES, { from: C });

    const newCRewards = await this.rewards.unclaimedRewards(C);
    assert.equal(newCRewards, 5);

    const newTotalRewards = await this.rewards.totalRewards();
    assert.equal(newTotalRewards, 5); // -5, because Because the 5 belonged to C

    const totalRedeemed = await this.rewardableToken.totalRedeemed();
    assert.equal(totalRedeemed, redeemedAmount);

    const totalShares = await this.rewards.totalShares();
    assert.equal(totalShares, 50); // MAX_SHARES - TOTAL_REDEEMED (100 - 50)

    const ARewards = await this.rewards.unclaimedRewards(A);
    assert.equal(ARewards.toNumber(), 2); // 20/50 * NEW_TOTAL_REWARDS

    const BRewards = await this.rewards.unclaimedRewards(B);
    assert.equal(BRewards.toNumber(), 3); // 30/50 * NEW_TOTAL_REWARDS
  });

  it('deposits calculate rewards based on current shares', async () => {
    const currentTotalRewards = await this.rewards.totalRewards();
    assert.equal(currentTotalRewards, 5); // Because the other 5 belonged to C

    await this.rewards.deposit(DEPOSIT_AMOUNT, { from: rewardsSource }); // +200 totalRewards

    const newTotalRewards = await this.rewards.totalRewards();
    assert.equal(newTotalRewards, 15); // (5 + DEPOSIT_AMOUNT)

    const ARewards = await this.rewards.unclaimedRewards(A);
    assert.equal(ARewards.toNumber(), 6);

    const BRewards = await this.rewards.unclaimedRewards(B);
    assert.equal(BRewards.toNumber(), 9);
  });

  it('transfers updates damping based on current maxShares', async () => {
    await this.rewardableToken.transfer(B, 10, { from: A });

    const ABalance = await this.rewardableToken.balanceOf(A);
    assert.equal(ABalance, 10);

    const BBalance = await this.rewardableToken.balanceOf(B);
    assert.equal(BBalance, 40);

    const ARewards = await this.rewards.unclaimedRewards(A);
    assert.equal(ARewards, 6); // Unchanged

    const BRewards = await this.rewards.unclaimedRewards(B);
    assert.equal(BRewards, 9); // Unchanged
  });
});
