// const { assertEvent, expectThrow } = require('./helpers');

const BasicModerator = artifacts.require('BasicModerator');
const RewardableToken = artifacts.require('RewardableToken');
const PAYToken = artifacts.require('PAYToken');
const Rewards = artifacts.require('Rewards');

const MAX_SHARES = 1000;
const DEPOSIT_AMOUNT = 400;
const TEST_BYTES = '0x341f85f5eca6304166fcfb6f591d49f6019f23fa39be0615e6417da06bf747ce'; // bytes

// * (A withdraws 100% rewards, then redeems 50% of his shares)
contract('Rewards (full withdrawal, partial burn)', ([owner, A, C, rewardsSource]) => {
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
    await this.rewards.whitelist(A);

    // Links token and rewards contracts
    await this.rewardableToken.setRewards(this.rewards.address, { from: owner });

    // Top up rewardsSource balance
    await this.rewardsToken.mint(rewardsSource, 1000000);
    await this.rewardsToken.approve(this.rewards.address, 1000000, { from: rewardsSource });
    await this.rewards.addRewarder(rewardsSource);

    // Set up test scenario
    await this.rewardableToken.issue(A, 250, TEST_BYTES);
    await this.rewardableToken.issue(C, 250, TEST_BYTES);
  });

  it('should initialize correctly', async () => {
    const isRewarder = await this.rewards.isRewarder(owner);
    assert.equal(isRewarder, true);

    const totalRewards = await this.rewards.totalRewards();
    assert.equal(totalRewards, 0);

    const ARewards = await this.rewards.unclaimedRewards(A);
    assert.equal(ARewards, 0);

    const CRewards = await this.rewards.unclaimedRewards(C);
    assert.equal(CRewards, 0);

    const isRunning = await this.rewards.isRunning();
    assert.equal(isRunning, true);

    const maxShares = await this.rewards.maxShares();
    assert.equal(maxShares, MAX_SHARES);

    const totalRedeemed = await this.rewardableToken.totalRedeemed();
    assert.equal(totalRedeemed, 0);

    const totalShares = await this.rewards.totalShares();
    assert.equal(totalShares, MAX_SHARES); // maxShares - totalRedeemed
  });

  it('deposit rewards', async () => {
    await this.rewards.deposit(DEPOSIT_AMOUNT, { from: rewardsSource });

    const totalRewards = await this.rewards.totalRewards();
    assert.equal(totalRewards, DEPOSIT_AMOUNT);

    const AUnclaimedRewards = await this.rewards.unclaimedRewards(A);
    assert.equal(AUnclaimedRewards, 100); // 250/1000 * DEPOSIT_AMOUNT

    const AClaimedRewards = await this.rewards.claimedRewards(A);
    assert.equal(AClaimedRewards, 0);

    const CUnclaimedRewards = await this.rewards.unclaimedRewards(C);
    assert.equal(CUnclaimedRewards, 100); // 250/1000 * DEPOSIT_AMOUNT

    const CClaimedRewards = await this.rewards.claimedRewards(C);
    assert.equal(CClaimedRewards, 0);
  });

  it('A withdraws 100% of their rewards', async () => {
    await this.rewards.withdraw({ from: A });

    const AUnclaimedRewards = await this.rewards.unclaimedRewards(A);
    assert.equal(AUnclaimedRewards, 0);

    const AClaimedRewards = await this.rewards.claimedRewards(A);
    assert.equal(AClaimedRewards, 100);
  });

  it('A burns 50% of their tokens', async () => {
    const oldTotalShares = await this.rewardableToken.totalSupply();
    assert.equal(oldTotalShares, 500);

    const redeemedAmount = 125;
    await this.rewardableToken.redeem(redeemedAmount, TEST_BYTES, { from: A });

    const newTotalShares = await this.rewardableToken.totalSupply();
    assert.equal(newTotalShares, (oldTotalShares.toNumber() - redeemedAmount)); // 250 = totalSupply(500) - 250

    const totalRedeemed = await this.rewardableToken.totalRedeemed();
    assert.equal(totalRedeemed, redeemedAmount);

    const totalRewards = await this.rewards.totalRewards();
    assert.equal(totalRewards, 350); // DEPOSIT_AMOUNT (400) - REDEEMABLE_REWARDS (125/1000 * 400 = 50)

    const AClaimedRewards = await this.rewards.claimedRewards(A);
    assert.equal(AClaimedRewards, 100); // Unchanged

    const AUnclaimedRewards = await this.rewards.unclaimedRewards(A);
    assert.equal(AUnclaimedRewards, 0); // Unchanged

    const CClaimedRewards = await this.rewards.claimedRewards(C);
    assert.equal(CClaimedRewards, 0); // Unchanged    

    const CUnclaimedRewards = await this.rewards.unclaimedRewards(C);
    assert.equal(CUnclaimedRewards, 100); // Should be 100
  });
});
