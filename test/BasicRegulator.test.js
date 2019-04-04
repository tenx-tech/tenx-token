const BasicModerator = artifacts.require('BasicModerator.sol');

const TEST_BYTES = '0x341f85f5eca6304166fcfb6f591d49f6019f23fa39be0615e6417da06bf747ce';
const STATUS_TRANSFER_SUCCESS = '0x51';
const SUCCESS_APPLICATION_CODE = '0x0000000000000000000000000000000000000000000000000000000000000000';

contract('BasicModerator', ([owner, sender, recipient]) => {
  before(async () => {
    // Deploys moderator
    this.moderator = await BasicModerator.new();
  });

  it('owner should start as moderator', async () => {
    const result = await this.moderator.isModerator(owner);
    assert.equal(result, true);
  });

  it('should return on verifyIssue()', async () => {
    const {
      allowed,
      statusCode,
      applicationCode,
    } = await this.moderator.verifyIssue(recipient, 100, TEST_BYTES);
    assert.equal(allowed, true);
    assert.equal(statusCode, STATUS_TRANSFER_SUCCESS);
    assert.equal(applicationCode, SUCCESS_APPLICATION_CODE);
  });

  it('should return on verifyTransfer()', async () => {
    const {
      allowed,
      statusCode,
      applicationCode,
    } = await this.moderator.verifyTransfer(sender, recipient, 100, TEST_BYTES);
    assert.equal(allowed, true);
    assert.equal(statusCode, STATUS_TRANSFER_SUCCESS);
    assert.equal(applicationCode, SUCCESS_APPLICATION_CODE);
  });

  it('should return on verifyTransferFrom()', async () => {
    const {
      allowed,
      statusCode,
      applicationCode,
    } = await this.moderator.verifyTransferFrom(sender, recipient, owner, 100, TEST_BYTES);
    assert.equal(allowed, true);
    assert.equal(statusCode, STATUS_TRANSFER_SUCCESS);
    assert.equal(applicationCode, SUCCESS_APPLICATION_CODE);
  });
});
