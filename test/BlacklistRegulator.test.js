// const { assertEvent, expectThrow } = require('./helpers');

const BlacklistModerator = artifacts.require('BlacklistModerator.sol');

const ALLOWED = '0x51';
const DISALLOWED = '0x50';
const ALLOWED_APPLICATION_CODE = web3.utils.keccak256('org.tenx.allowed');
const FORBIDDEN_APPLICATION_CODE = web3.utils.keccak256('org.tenx.forbidden');
const TEST_BYTES = '0x341f85f5eca6304166fcfb6f591d49f6019f23fa39be0615e6417da06bf747ce';

contract('BlacklistModerator', ([owner, sender, recipient]) => {
  before(async () => {
    this.moderator = await BlacklistModerator.deployed();
  });

  it('owner should be a moderator', async () => {
    const result = await this.moderator.isModerator(owner);
    assert.equal(result, true);
  });

  it('when unblacklisted, should return true on verifyIssue()', async () => {
    const isBlacklisted = await this.moderator.isBlacklisted(recipient);
    assert.equal(isBlacklisted, false);

    const {
      allowed,
      statusCode,
      applicationCode,
    } = await this.moderator.verifyIssue(recipient, 100, TEST_BYTES);
    assert.equal(allowed, true);
    assert.equal(statusCode, ALLOWED);
    assert.equal(applicationCode, ALLOWED_APPLICATION_CODE);
  });

  it('when unblacklisted, should return true on verifyTransfer()', async () => {
    const {
      allowed,
      statusCode,
      applicationCode,
    } = await this.moderator.verifyTransfer(sender, recipient, 100, TEST_BYTES);
    assert.equal(allowed, true);
    assert.equal(statusCode, ALLOWED);
    assert.equal(applicationCode, ALLOWED_APPLICATION_CODE);
  });

  it('when unblacklisted, should return true on verifyTransferFrom()', async () => {
    const {
      allowed,
      statusCode,
      applicationCode,
    } = await this.moderator.verifyTransferFrom(sender, recipient, owner, 100, TEST_BYTES);
    assert.equal(allowed, true);
    assert.equal(statusCode, ALLOWED);
    assert.equal(applicationCode, ALLOWED_APPLICATION_CODE);
  });

  it('when unblacklisted, should return true on verifyRedeem()', async () => {
    const {
      allowed,
      statusCode,
      applicationCode,
    } = await this.moderator.verifyRedeem(recipient, 100, TEST_BYTES);
    assert.equal(allowed, true);
    assert.equal(statusCode, ALLOWED);
    assert.equal(applicationCode, ALLOWED_APPLICATION_CODE);
  });

  it('when unblacklisted, should return true on verifyRedeemFrom()', async () => {
    const {
      allowed,
      statusCode,
      applicationCode,
    } = await this.moderator.verifyRedeemFrom(recipient, owner, 100, TEST_BYTES);
    assert.equal(allowed, true);
    assert.equal(statusCode, ALLOWED);
    assert.equal(applicationCode, ALLOWED_APPLICATION_CODE);
  });

  it('can blacklist address', async () => {
    await this.moderator.blacklist(recipient, { from: owner });

    const isBlacklisted = await this.moderator.isBlacklisted(recipient);
    assert.equal(isBlacklisted, true);
  });

  it('when blacklisted, should return false on verifyIssue()', async () => {
    const {
      allowed,
      statusCode,
      applicationCode,
    } = await this.moderator.verifyIssue(recipient, 100, TEST_BYTES);
    assert.equal(allowed, false);
    assert.equal(statusCode, DISALLOWED);
    assert.equal(applicationCode, FORBIDDEN_APPLICATION_CODE);
  });

  it('when blacklisted, should return false on verifyTransfer()', async () => {
    const {
      allowed,
      statusCode,
      applicationCode,
    } = await this.moderator.verifyTransfer(sender, recipient, 100, TEST_BYTES);
    assert.equal(allowed, false);
    assert.equal(statusCode, DISALLOWED);
    assert.equal(applicationCode, FORBIDDEN_APPLICATION_CODE);
  });

  it('when blacklisted, should return false on verifyTransferFrom()', async () => {
    const {
      allowed,
      statusCode,
      applicationCode,
    } = await this.moderator.verifyTransferFrom(sender, recipient, owner, 100, TEST_BYTES);
    assert.equal(allowed, false);
    assert.equal(statusCode, DISALLOWED);
    assert.equal(applicationCode, FORBIDDEN_APPLICATION_CODE);
  });

  it('when blacklisted, should return false on verifyRedeem()', async () => {
    const {
      allowed,
      statusCode,
      applicationCode,
    } = await this.moderator.verifyRedeem(recipient, 100, TEST_BYTES);
    assert.equal(allowed, false);
    assert.equal(statusCode, DISALLOWED);
    assert.equal(applicationCode, FORBIDDEN_APPLICATION_CODE);
  });

  it('when blacklisted, should return false on verifyRedeemFrom()', async () => {
    const {
      allowed,
      statusCode,
      applicationCode,
    } = await this.moderator.verifyRedeemFrom(recipient, owner, 100, TEST_BYTES);
    assert.equal(allowed, false);
    assert.equal(statusCode, DISALLOWED);
    assert.equal(applicationCode, FORBIDDEN_APPLICATION_CODE);
  });  
});
