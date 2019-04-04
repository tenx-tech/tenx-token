const { expectThrow } = require('./helpers');

const ERC1594 = artifacts.require('ERC1594Mock');
const PermissionedModerator = artifacts.require('PermissionedModerator');

const TOTAL_SHARES = 200;
const ISSUE_AMOUNT = 100;
const TRANSFER_AMOUNT = 10;
const APPROVE_AMOUNT = 5;
const FAR_FUTURE_DATE = Math.round(Date.now() / 1000) + 100000;
const ALLOWED = '0x51';
const DISALLOWED = '0x50';
const EMPTY_BYTES = '0x';

contract('ERC1594 + PermissionedModerator', ([owner, A, B]) => {
  before(async () => {
    // Deploys moderator
    this.moderator = await PermissionedModerator.new();

    // Deploys tokens
    this.rewardableToken = await ERC1594.new(
      this.moderator.address,
      TOTAL_SHARES, // Deploy with test cap
    );
  });

  it('issue() to an unpermitted party should be disallowed', async () => {
    await expectThrow(this.rewardableToken.issue(A, ISSUE_AMOUNT, EMPTY_BYTES, { from: owner }));

    const { statusCode } = await this.moderator.verifyIssue(
      A,
      ISSUE_AMOUNT,
      EMPTY_BYTES,
      { from: owner },
    );
    assert.equal(statusCode, DISALLOWED);
  });

  it('moderator should be able to add receive permissions', async () => {
    const investor = A;
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

    const sendPermission = await this.moderator.canSend(investor);
    assert.equal(sendPermission, false);

    const receivePermission = await this.moderator.canReceive(investor);
    assert.equal(receivePermission, true);

    const { statusCode } = await this.moderator.verifyIssue(A, ISSUE_AMOUNT, EMPTY_BYTES);
    assert.equal(statusCode, ALLOWED);

    await this.rewardableToken.issue(A, ISSUE_AMOUNT, EMPTY_BYTES, { from: owner });
    const balance = await this.rewardableToken.balanceOf(A);
    assert.equal(balance.toNumber(), ISSUE_AMOUNT);
  });

  it('transfers from an unpermitted party should be disallowed', async () => {
    // Add B as a permitted recipient
    const investor = B;
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

    const sendPermission = await this.moderator.canSend(A);
    assert.equal(sendPermission, false);

    const { statusCode: transferstatusCode } = await this.moderator.verifyTransfer(A, B, TRANSFER_AMOUNT, EMPTY_BYTES);
    assert.equal(transferstatusCode, DISALLOWED);

    const { statusCode: transferFromstatusCode } = await this.moderator.verifyTransferFrom(A, B, owner, TRANSFER_AMOUNT, EMPTY_BYTES);
    assert.equal(transferFromstatusCode, DISALLOWED);

    // A should not be able to transfer because it has no send permission.
    await expectThrow(this.rewardableToken.transfer(B, TRANSFER_AMOUNT, { from: A }));

    // Likewise for transferFrom
    await this.rewardableToken.approve(B, TRANSFER_AMOUNT, { from: A });
    await expectThrow(this.rewardableToken.transferFrom(B, A, TRANSFER_AMOUNT));
  });

  it('moderator should be able to add receive permissions', async () => {
    // Add A as a permitted sender (and not receiver)
    const investor = A;
    const sendAllowed = true;
    const sendTime = 0;
    const receiveAllowed = false;
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

    const sendPermission = await this.moderator.canSend(A);
    assert.equal(sendPermission, true);

    const receivePermissionA = await this.moderator.canReceive(A);
    assert.equal(receivePermissionA, false);

    const receivePermissionB = await this.moderator.canReceive(B);
    assert.equal(receivePermissionB, true);

    const { statusCode: issuestatusCode } = await this.moderator.verifyIssue(A, ISSUE_AMOUNT, EMPTY_BYTES);
    assert.equal(issuestatusCode, DISALLOWED);

    const { statusCode: transferstatusCode } = await this.moderator.verifyTransfer(A, B, TRANSFER_AMOUNT, EMPTY_BYTES);
    assert.equal(transferstatusCode, ALLOWED);

    const { statusCode: transferFromstatusCode } = await this.moderator.verifyTransferFrom(A, B, owner, TRANSFER_AMOUNT, EMPTY_BYTES);
    assert.equal(transferFromstatusCode, ALLOWED);

    // Transfer should succeed
    await this.rewardableToken.transfer(B, TRANSFER_AMOUNT, { from: A });
    const balanceA = await this.rewardableToken.balanceOf(A);
    assert.equal(balanceA.toNumber(), ISSUE_AMOUNT - TRANSFER_AMOUNT);
    const balanceB = await this.rewardableToken.balanceOf(B);
    assert.equal(balanceB.toNumber(), TRANSFER_AMOUNT);

    // Approve and transferFrom should succeed
    await this.rewardableToken.approve(B, APPROVE_AMOUNT, { from: A });
    const allowance = await this.rewardableToken.allowance(A, B);
    assert.equal(allowance.toNumber(), APPROVE_AMOUNT);

    await this.rewardableToken.transferFrom(A, B, APPROVE_AMOUNT, { from: B });
    const newBalanceA = await this.rewardableToken.balanceOf(A);
    assert.equal(newBalanceA.toNumber(), ISSUE_AMOUNT - TRANSFER_AMOUNT - APPROVE_AMOUNT);
    const newBalanceB = await this.rewardableToken.balanceOf(B);
    assert.equal(newBalanceB.toNumber(), TRANSFER_AMOUNT + APPROVE_AMOUNT);
  });

  it('transfers between unpermitted parties should be disallowed', async () => {
    const sendPermission = await this.moderator.canSend(B);
    assert.equal(sendPermission, false);

    const receivePermissionA = await this.moderator.canReceive(A);
    assert.equal(receivePermissionA, false);

    const { statusCode: transferstatusCode } = await this.moderator.verifyTransfer(B, A, TRANSFER_AMOUNT, EMPTY_BYTES);
    assert.equal(transferstatusCode, DISALLOWED);

    const { statusCode: transferFromstatusCode } = await this.moderator.verifyTransferFrom(B, A, owner, TRANSFER_AMOUNT, EMPTY_BYTES);
    assert.equal(transferFromstatusCode, DISALLOWED);

    // Transfer should fail
    await expectThrow(this.rewardableToken.transfer(A, 1, { from: B }));
    await expectThrow(this.rewardableToken.transferWithData(A, 1, EMPTY_BYTES, { from: B }));

    // TransferFrom should fail
    await this.rewardableToken.approve(A, 1, { from: B });
    await expectThrow(this.rewardableToken.transferFrom(B, A, TRANSFER_AMOUNT));
    await expectThrow(this.rewardableToken.transferFromWithData(B, A, TRANSFER_AMOUNT, EMPTY_BYTES));
  });
});
