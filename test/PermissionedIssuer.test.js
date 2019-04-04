const { expectThrow } = require('./helpers');

const RewardableToken = artifacts.require('RewardableToken');
const PAYToken = artifacts.require('PAYToken');
const Issuer = artifacts.require('Issuer');
const Rewards = artifacts.require('Rewards');
const PermissionedModerator = artifacts.require('PermissionedModerator');

const ClaimState = {
  NONE: 0,
  ISSUED: 1,
  CLAIMED: 2,
};
const TOTAL_SHARES = 200;
const CLAIM_AMOUNT = 50;
const FAR_FUTURE_DATE = Math.round(Date.now() / 1000) + 100000;
const ALLOWED = '0x51';
const DISALLOWED = '0x50';
const EMPTY_BYTES = '0x';

contract('Issuer + PermissionedModerator', ([owner, investor, rewardsSource]) => {
  before(async () => {
    // Deploys moderator
    this.moderator = await PermissionedModerator.new();

    // Deploys tokens
    this.token = await RewardableToken.new(this.moderator.address, TOTAL_SHARES);
    this.rewardsToken = await PAYToken.new();

    // Deploys rewards
    this.rewards = await Rewards.new(
      this.token.address,
      this.rewardsToken.address,
    );
    await this.token.setRewards(this.rewards.address, { from: owner });

    // Deploy issuer
    this.issuer = await Issuer.new(this.token.address);
    await this.token.transferIssuership(this.issuer.address);
  });

  it('issuers should be able to issue a claim', async () => {
    await this.issuer.issue(investor, CLAIM_AMOUNT, { from: owner });
    const { status, amount, issuer } = await this.issuer.claims(investor);
    assert.equal(amount.toString(), CLAIM_AMOUNT);
    assert.equal(status.toNumber(), ClaimState.ISSUED, 'Claim should be marked as issued.');
    assert.equal(issuer, owner);
  });

  it('investors should NOT be able to withdraw without receive permission', async () => {
    const { statusCode } = await this.moderator.verifyIssue(investor, CLAIM_AMOUNT, EMPTY_BYTES);
    assert.equal(statusCode, DISALLOWED);

    await expectThrow(this.issuer.claim({ from: investor }));
  });

  it('moderator should be able to add receive permissions', async () => {
    const sendAllowed = false;
    const sendTime = 0;
    const receiveAllowed = true;
    const receiveTime = 0;
    const expiryTime = FAR_FUTURE_DATE;

    await this.moderator.setPermission(
      investor,
      sendAllowed,
      sendTime,
      receiveAllowed,
      receiveTime,
      expiryTime,
      { from: owner },
    );

    const receivePermission = await this.moderator.canReceive(investor);
    assert.equal(receivePermission, true);

    const { statusCode } = await this.moderator.verifyIssue(investor, CLAIM_AMOUNT, EMPTY_BYTES);
    assert.equal(statusCode, ALLOWED);

    await this.issuer.claim({ from: investor });
    const balance = await this.token.balanceOf(investor);
    assert.equal(balance.toNumber(), CLAIM_AMOUNT);
  });
});
