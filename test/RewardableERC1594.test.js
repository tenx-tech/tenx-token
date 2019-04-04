const { assertEvent } = require('./helpers');

const BasicModerator = artifacts.require('BasicModerator');
const RewardableToken = artifacts.require('RewardableToken');
const PAYToken = artifacts.require('PAYToken');
const Rewards = artifacts.require('Rewards');

const TOTAL_SHARES = 200;
const DEPOSIT_AMOUNT = 200;
const ISSUE_AMOUNT = 100;
const TEST_BYTES = '0x341f85f5eca6304166fcfb6f591d49f6019f23fa39be0615e6417da06bf747ce';

contract('RewardableToken with ERC1594', ([owner, issuer, A, other, rewardsSource]) => {
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

    // Top up rewards
    await this.rewardsToken.mint(rewardsSource, 10000);
    await this.rewardsToken.approve(this.rewards.address, 10000, { from: rewardsSource });
    await this.rewards.addRewarder(rewardsSource);
  });

  it('should initialize correctly', async () => {
    const isIssuer = await this.rewardableToken.isIssuer(owner);
    assert.equal(isIssuer, true);

    const totalShares = await this.rewards.totalShares();
    assert.equal(totalShares, TOTAL_SHARES);
  });

  it('should be able to add issuer', async () => {
    const result = await this.rewardableToken.addIssuer(issuer, { from: owner });
    assertEvent(result, {
      event: 'IssuerAdded',
      args: {
        account: issuer,
      },
    }, 'A IssuerAdded event is emitted.');

    const isIssuer = await this.rewardableToken.isIssuer(issuer);
    assert.equal(isIssuer, true);
  });

  it('issuers should be able to issue', async () => {
    const result = await this.rewardableToken.issue(A, ISSUE_AMOUNT, TEST_BYTES, { from: issuer });
    assertEvent(result, {
      event: 'Issued',
      args: {
        operator: issuer,
        to: A,
        value: ISSUE_AMOUNT,
        data: TEST_BYTES,
      },
    }, 'A Issued event is emitted.', 1);

    const aBalance = await this.rewardableToken.balanceOf(A);
    assert.equal(aBalance, ISSUE_AMOUNT);

    const TotalRewards = await this.rewards.totalRewards();
    assert.equal(TotalRewards, 0);

    const aRewards = await this.rewards.unclaimedRewards(A);
    assert.equal(aRewards.toNumber(), 0);

    await this.rewards.deposit(DEPOSIT_AMOUNT, { from: rewardsSource });

    const newTotalRewards = await this.rewards.totalRewards();
    assert.equal(newTotalRewards, DEPOSIT_AMOUNT);

    const aNewRewards = await this.rewards.unclaimedRewards(A);
    assert.equal(aNewRewards.toNumber(), 100);
  });

  it('users should be able to redeem', async () => {
    const redeemAmount = 25;
    const result = await this.rewardableToken.redeem(redeemAmount, TEST_BYTES, { from: A });
    assertEvent(result, {
      event: 'Redeemed',
      args: {
        operator: A,
        from: A,
        value: redeemAmount,
        data: TEST_BYTES,
      },
    }, 'A Redeemed event is emitted.', 1);

    const totalShares = await this.rewards.totalShares();
    assert.equal(totalShares, 175); // -redeemAmount

    const aBalance = await this.rewardableToken.balanceOf(A);
    assert.equal(aBalance, 75); // -redeemAmount

    const aNewRewards = await this.rewards.unclaimedRewards(A);
    assert.equal(aNewRewards, 100); // unchanged
  });

  it('users should be able to redeemFrom', async () => {
    const redeemAmount = 25;
    await this.rewardableToken.approve(other, redeemAmount, { from: A });
    const result = await this.rewardableToken.redeemFrom(A, redeemAmount, TEST_BYTES, { from: other });
    assertEvent(result, {
      event: 'Approval',
      args: {
        spender: other,
        owner: A,
        value: 0,
      },
    }, 'A Approval event is emitted.', 1);

    const totalShares = await this.rewards.totalShares();
    assert.equal(totalShares, 150); // -redeemAmount

    const aBalance = await this.rewardableToken.balanceOf(A);
    assert.equal(aBalance, 50); // -redeemAmount

    const aNewRewards = await this.rewards.unclaimedRewards(A);
    assert.equal(aNewRewards, 100); // unchanged
  });
});

