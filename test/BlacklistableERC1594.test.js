const { expectThrow } = require('./helpers');

const ERC1594 = artifacts.require('ERC1594Mock');
const BlacklistModerator = artifacts.require('BlacklistModerator');

const TOTAL_SHARES = 200;
const ISSUE_AMOUNT = 100;
const TRANSFER_AMOUNT = 10;
const REDEEM_AMOUNT = 1;
const ALLOWED = '0x51';
const DISALLOWED = '0x50';
const EMPTY_BYTES = '0x';

contract('ERC1594 + BlacklistModerator', ([owner, A, B, other]) => {
  before(async () => {
    // Deploys moderator
    this.moderator = await BlacklistModerator.new();

    // Deploys tokens
    this.rewardableToken = await ERC1594.new(
      this.moderator.address,
      TOTAL_SHARES, // Deploy with test cap
    );
  });

  it('issue() should be unrestricted by default', async () => {
    const { statusCode } = await this.moderator.verifyIssue(
      A,
      ISSUE_AMOUNT,
      EMPTY_BYTES,
      { from: owner },
    );
    assert.equal(statusCode, ALLOWED);

    await this.rewardableToken.issue(A, ISSUE_AMOUNT, EMPTY_BYTES, { from: owner });

    const aBalance = await this.rewardableToken.balanceOf(A);
    assert.equal(aBalance, ISSUE_AMOUNT);
  });

  it('transfer() should be unrestricted by default', async () => {
    const { statusCode } = await this.moderator.verifyTransfer(
      A,
      B,
      TRANSFER_AMOUNT,
      EMPTY_BYTES,
      { from: owner },
    );
    assert.equal(statusCode, ALLOWED);

    await this.rewardableToken.transfer(B, TRANSFER_AMOUNT, { from: A });

    const aBalance = await this.rewardableToken.balanceOf(A);
    assert.equal(aBalance.toNumber(), (ISSUE_AMOUNT - TRANSFER_AMOUNT));

    const bBalance = await this.rewardableToken.balanceOf(B);
    assert.equal(bBalance, TRANSFER_AMOUNT);
  });

  it('transferFrom() should be unrestricted by default', async () => {
    const { statusCode } = await this.moderator.verifyTransferFrom(
      A,
      B,
      other,
      TRANSFER_AMOUNT,
      EMPTY_BYTES,
      { from: owner },
    );
    assert.equal(statusCode, ALLOWED);

    await this.rewardableToken.approve(other, TRANSFER_AMOUNT, { from: A });
    await this.rewardableToken.transferFrom(A, B, TRANSFER_AMOUNT, { from: other });

    const bBalance = await this.rewardableToken.balanceOf(B);
    assert.equal(bBalance.toNumber(), (2 * TRANSFER_AMOUNT));
  });

  it('redeem() should be unrestricted by default', async () => {
    const prevABalance = await this.rewardableToken.balanceOf(A);

    const { statusCode } = await this.moderator.verifyRedeem(
      A,
      REDEEM_AMOUNT,
      EMPTY_BYTES,
      { from: owner },
    );
    assert.equal(statusCode, ALLOWED);

    await this.rewardableToken.redeem(REDEEM_AMOUNT, EMPTY_BYTES, { from: A });

    const aBalance = await this.rewardableToken.balanceOf(A);
    assert.equal(aBalance.toNumber(), (prevABalance.toNumber() - REDEEM_AMOUNT));
  });

  it('redeemFrom() should be unrestricted by default', async () => {
    const prevABalance = await this.rewardableToken.balanceOf(A);

    const { statusCode } = await this.moderator.verifyRedeemFrom(
      A,
      B,
      REDEEM_AMOUNT,
      EMPTY_BYTES,
      { from: owner },
    );
    assert.equal(statusCode, ALLOWED);

    await this.rewardableToken.approve(B, REDEEM_AMOUNT, { from: A });
    await this.rewardableToken.redeemFrom(A, REDEEM_AMOUNT, EMPTY_BYTES, { from: B });

    const aBalance = await this.rewardableToken.balanceOf(A);
    assert.equal(aBalance.toNumber(), (prevABalance.toNumber() - REDEEM_AMOUNT));
  });

  it('can blacklist address', async () => {
    await this.moderator.blacklist(A, { from: owner });

    const isBlacklisted = await this.moderator.isBlacklisted(A);
    assert.equal(isBlacklisted, true);
  });

  it('issue() should be restricted for blacklisted address', async () => {
    const { statusCode } = await this.moderator.verifyIssue(
      A,
      ISSUE_AMOUNT,
      EMPTY_BYTES,
      { from: owner },
    );
    assert.equal(statusCode, DISALLOWED);

    await expectThrow(this.rewardableToken.issue(A, ISSUE_AMOUNT, EMPTY_BYTES, { from: owner }));
  });

  it('transfer() should be restricted for blacklisted address', async () => {
    const { statusCode } = await this.moderator.verifyTransfer(
      A,
      B,
      TRANSFER_AMOUNT,
      EMPTY_BYTES,
      { from: owner },
    );
    assert.equal(statusCode, DISALLOWED);

    await expectThrow(this.rewardableToken.transfer(B, TRANSFER_AMOUNT, { from: A }));
  });

  it('transferFrom() should be restricted for blacklisted address', async () => {
    const { statusCode } = await this.moderator.verifyTransferFrom(
      A,
      B,
      other,
      TRANSFER_AMOUNT,
      EMPTY_BYTES,
      { from: owner },
    );
    assert.equal(statusCode, DISALLOWED);

    await this.rewardableToken.approve(other, TRANSFER_AMOUNT, { from: A });
    await expectThrow(this.rewardableToken.transferFrom(A, B, TRANSFER_AMOUNT, { from: other }));
  });

  it('redeem() should be restricted for blacklisted address', async () => {
    const { statusCode } = await this.moderator.verifyRedeem(
      A,
      REDEEM_AMOUNT,
      EMPTY_BYTES,
      { from: owner },
    );
    assert.equal(statusCode, DISALLOWED);

    await expectThrow(this.rewardableToken.redeem(REDEEM_AMOUNT, EMPTY_BYTES, { from: A }));
  });

  it('redeemFrom() should be restricted for blacklisted address', async () => {
    const { statusCode } = await this.moderator.verifyRedeemFrom(
      A,
      B,
      REDEEM_AMOUNT,
      EMPTY_BYTES,
      { from: owner },
    );
    assert.equal(statusCode, DISALLOWED);

    await this.rewardableToken.approve(B, REDEEM_AMOUNT, { from: A });
    await expectThrow(this.rewardableToken.redeemFrom(A, REDEEM_AMOUNT, EMPTY_BYTES, { from: B }));
  });
});
