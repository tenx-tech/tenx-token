const { assertEvent, expectThrow } = require('./helpers');

const PermissionedModerator = artifacts.require('PermissionedModerator.sol');

// block.timestamp is 3 digits less than Date.now() because it uses seconds instead of milliseconds
const PAST_DATE = Math.round(Date.now() / 1000) - 100000;
const FAR_FUTURE_DATE = Math.round(Date.now() / 1000) + 100000;
const ALLOWED = '0x51';
const DISALLOWED = '0x50';
const ALLOWED_APPLICATION_CODE = web3.utils.keccak256('org.tenx.allowed');
const FORBIDDEN_APPLICATION_CODE = web3.utils.keccak256('org.tenx.forbidden');
const EMPTY_BYTES = '0x';

contract('PermissionedModerator', ([owner, sender, recipient, moderatorRole, other]) => {
  before(async () => {
    this.moderator = await PermissionedModerator.new();
  });

  it('owner should be a moderator', async () => {
    const result = await this.moderator.isModerator(owner);
    assert.equal(result, true);
  });

  it('other accounts should NOT be able to add new moderators', async () => {
    await expectThrow(this.moderator.addModerator(moderatorRole, { from: other }));
    const status = await this.moderator.isModerator(other);
    assert.equal(status, false);
  });

  it('moderators should be able to add new moderators', async () => {
    const result = await this.moderator.addModerator(moderatorRole, { from: owner });
    assertEvent(result, {
      event: 'ModeratorAdded',
      args: {
        account: moderatorRole,
      },
    }, 'A ModeratorAdded event is emitted.');
    const status = await this.moderator.isModerator(moderatorRole);
    assert.equal(status, true);
  });

  it('should return DISALLOWED code on verifyTransfer()', async () => {
    const { allowed, statusCode, applicationCode } = await this.moderator.verifyTransfer(sender, recipient, 100, EMPTY_BYTES);
    assert.equal(allowed, false);
    assert.equal(statusCode, DISALLOWED);
    assert.equal(applicationCode, FORBIDDEN_APPLICATION_CODE);
  });

  it('should return DISALLOWED code on verifyTransferFrom()', async () => {
    const { allowed, statusCode, applicationCode } = await this.moderator.verifyTransferFrom(sender, recipient, owner, 100, EMPTY_BYTES);
    assert.equal(allowed, false);
    assert.equal(statusCode, DISALLOWED);
    assert.equal(applicationCode, FORBIDDEN_APPLICATION_CODE);
  });

  it('should return DISALLOWED code on verifyIssue()', async () => {
    const { allowed, statusCode, applicationCode } = await this.moderator.verifyIssue(recipient, 100, EMPTY_BYTES);
    assert.equal(allowed, false);
    assert.equal(statusCode, DISALLOWED);
    assert.equal(applicationCode, FORBIDDEN_APPLICATION_CODE);
  });

  it('other accounts should NOT be able to add new moderators', async () => {
    await expectThrow(this.moderator.addModerator(moderatorRole, { from: other }));
    const status = await this.moderator.isModerator(other);
    assert.equal(status, false);
  });

  it('canSend should return false by default', async () => {
    const result = await this.moderator.canSend(sender);
    assert.equal(result, false);
  });

  it('canReceive should return false by default', async () => {
    const result = await this.moderator.canReceive(recipient);
    assert.equal(result, false);
  });

  it('other accounts should NOT be able to set permissions', async () => {
    const investor = sender;
    const canSend = true;
    const sendTime = 0;
    const canReceive = false;
    const receiveTime = 0;
    const expiryTime = FAR_FUTURE_DATE;

    await expectThrow(this.moderator.setPermission(
      investor,
      canSend,
      sendTime,
      canReceive,
      receiveTime,
      expiryTime,
      { from: other },
    ));
  });

  it('moderators should be able to set permissions for receive exclusively without a timelock', async () => {
    const investor = recipient;
    const sendAllowed = false;
    const sendTime = 0;
    const receiveAllowed = true;
    const receiveTime = 0;
    const expiryTime = FAR_FUTURE_DATE;

    const result = await this.moderator.setPermission(
      investor,
      sendAllowed,
      sendTime,
      receiveAllowed,
      receiveTime,
      expiryTime,
      { from: moderatorRole },
    );
    assertEvent(result, {
      event: 'PermissionChanged',
      args: {
        investor,
        sendAllowed,
        sendTime,
        receiveAllowed,
        receiveTime,
        expiryTime,
        moderator: moderatorRole,
      },
    }, 'A PermissionChanged event is emitted.');

    const sendPermission = await this.moderator.canSend(investor);
    assert.equal(sendPermission, false);

    const receivePermission = await this.moderator.canReceive(investor);
    assert.equal(receivePermission, true);

    const { allowed, statusCode, applicationCode } = await this.moderator.verifyIssue(recipient, 100, EMPTY_BYTES);
    assert.equal(allowed, true);
    assert.equal(statusCode, ALLOWED);
    assert.equal(applicationCode, ALLOWED_APPLICATION_CODE);
  });

  it('moderators should be able to set permissions for receive exclusively with a future timelock', async () => {
    const investor = recipient;
    const sendAllowed = false;
    const sendTime = 0;
    const receiveAllowed = true;
    const receiveTime = FAR_FUTURE_DATE;
    const expiryTime = FAR_FUTURE_DATE;

    const result = await this.moderator.setPermission(
      investor,
      sendAllowed,
      sendTime,
      receiveAllowed,
      receiveTime,
      expiryTime,
      { from: moderatorRole },
    );
    assertEvent(result, {
      event: 'PermissionChanged',
      args: {
        investor,
        sendAllowed,
        sendTime,
        receiveAllowed,
        receiveTime,
        expiryTime,
        moderator: moderatorRole,
      },
    }, 'A PermissionChanged event is emitted.');

    const sendPermission = await this.moderator.canSend(investor);
    assert.equal(sendPermission, false);

    const receivePermission = await this.moderator.canReceive(investor);
    assert.equal(receivePermission, false);

    const { allowed, statusCode, applicationCode } = await this.moderator.verifyIssue(recipient, 100, EMPTY_BYTES);
    assert.equal(allowed, false);
    assert.equal(statusCode, DISALLOWED);
    assert.equal(applicationCode, FORBIDDEN_APPLICATION_CODE);
  });

  it('moderators should be able to set permissions for receive exclusively with a past timelock', async () => {
    const investor = recipient;
    const sendAllowed = false;
    const sendTime = 0;
    const receiveAllowed = true;
    const receiveTime = PAST_DATE;
    const expiryTime = FAR_FUTURE_DATE;

    const result = await this.moderator.setPermission(
      investor,
      sendAllowed,
      sendTime,
      receiveAllowed,
      receiveTime,
      expiryTime,
      { from: moderatorRole },
    );
    assertEvent(result, {
      event: 'PermissionChanged',
      args: {
        investor,
        sendAllowed,
        sendTime,
        receiveAllowed,
        receiveTime,
        expiryTime,
        moderator: moderatorRole,
      },
    }, 'A PermissionChanged event is emitted.');

    const sendPermission = await this.moderator.canSend(investor);
    assert.equal(sendPermission, false);

    const receivePermission = await this.moderator.canReceive(investor);
    assert.equal(receivePermission, true);

    const { allowed, statusCode, applicationCode } = await this.moderator.verifyIssue(recipient, 100, EMPTY_BYTES);
    assert.equal(allowed, true);
    assert.equal(statusCode, ALLOWED);
    assert.equal(applicationCode, ALLOWED_APPLICATION_CODE);
  });

  it('moderators should be able to set permissions for send exclusively without a timelock', async () => {
    const investor = sender;
    const sendAllowed = true;
    const sendTime = 0;
    const receiveAllowed = false;
    const receiveTime = 0;
    const expiryTime = FAR_FUTURE_DATE;

    const result = await this.moderator.setPermission(
      investor,
      sendAllowed,
      sendTime,
      receiveAllowed,
      receiveTime,
      expiryTime,
      { from: moderatorRole },
    );
    assertEvent(result, {
      event: 'PermissionChanged',
      args: {
        investor,
        sendAllowed,
        sendTime,
        receiveAllowed,
        receiveTime,
        expiryTime,
        moderator: moderatorRole,
      },
    }, 'A PermissionChanged event is emitted.');

    const sendPermission = await this.moderator.canSend(investor);
    assert.equal(sendPermission, true);

    const receivePermission = await this.moderator.canReceive(investor);
    assert.equal(receivePermission, false);

    const {
      allowed: transferAllowed,
      statusCode: transferstatusCode,
      applicationCode: transferapplicationCode,
    } = await this.moderator.verifyTransfer(sender, recipient, 100, EMPTY_BYTES);
    assert.equal(transferAllowed, true);
    assert.equal(transferstatusCode, ALLOWED);
    assert.equal(transferapplicationCode, ALLOWED_APPLICATION_CODE);

    const {
      allowed: transferFrmAllowed,
      statusCode: transferFrmstatusCode,
      applicationCode: transferFrmapplicationCode,
    } = await this.moderator.verifyTransferFrom(sender, recipient, owner, 100, EMPTY_BYTES);
    assert.equal(transferFrmAllowed, true);
    assert.equal(transferFrmstatusCode, ALLOWED);
    assert.equal(transferFrmapplicationCode, ALLOWED_APPLICATION_CODE);
  });

  it('moderators should be able to set permissions for send exclusively with a future timelock', async () => {
    const investor = sender;
    const sendAllowed = true;
    const sendTime = FAR_FUTURE_DATE;
    const receiveAllowed = false;
    const receiveTime = 0;
    const expiryTime = FAR_FUTURE_DATE;

    const result = await this.moderator.setPermission(
      investor,
      sendAllowed,
      sendTime,
      receiveAllowed,
      receiveTime,
      expiryTime,
      { from: moderatorRole },
    );
    assertEvent(result, {
      event: 'PermissionChanged',
      args: {
        investor,
        sendAllowed,
        sendTime,
        receiveAllowed,
        receiveTime,
        expiryTime,
        moderator: moderatorRole,
      },
    }, 'A PermissionChanged event is emitted.');

    const sendPermission = await this.moderator.canSend(investor);
    assert.equal(sendPermission, false);

    const receivePermission = await this.moderator.canReceive(investor);
    assert.equal(receivePermission, false);

    const {
      allowed: transferAllowed,
      statusCode: transferstatusCode,
      applicationCode: transferapplicationCode,
    } = await this.moderator.verifyTransfer(sender, recipient, 100, EMPTY_BYTES);
    assert.equal(transferAllowed, false);
    assert.equal(transferstatusCode, DISALLOWED);
    assert.equal(transferapplicationCode, FORBIDDEN_APPLICATION_CODE);

    const {
      allowed: transferFrmAllowed,
      statusCode: transferFrmstatusCode,
      applicationCode: transferFrmapplicationCode,
    } = await this.moderator.verifyTransferFrom(sender, recipient, owner, 100, EMPTY_BYTES);
    assert.equal(transferFrmAllowed, false);
    assert.equal(transferFrmstatusCode, DISALLOWED);
    assert.equal(transferFrmapplicationCode, FORBIDDEN_APPLICATION_CODE);
  });

  it('moderators should be able to set permissions for send exclusively with a past timelock', async () => {
    const investor = sender;
    const sendAllowed = true;
    const sendTime = PAST_DATE;
    const receiveAllowed = false;
    const receiveTime = 0;
    const expiryTime = FAR_FUTURE_DATE;

    const result = await this.moderator.setPermission(
      investor,
      sendAllowed,
      sendTime,
      receiveAllowed,
      receiveTime,
      expiryTime,
      { from: moderatorRole },
    );
    assertEvent(result, {
      event: 'PermissionChanged',
      args: {
        investor,
        sendAllowed,
        sendTime,
        receiveAllowed,
        receiveTime,
        expiryTime,
        moderator: moderatorRole,
      },
    }, 'A PermissionChanged event is emitted.');

    const sendPermission = await this.moderator.canSend(investor);
    assert.equal(sendPermission, true);

    const receivePermission = await this.moderator.canReceive(investor);
    assert.equal(receivePermission, false);

    const {
      allowed: transferAllowed,
      statusCode: transferstatusCode,
      applicationCode: transferapplicationCode,
    } = await this.moderator.verifyTransfer(sender, recipient, 100, EMPTY_BYTES);
    assert.equal(transferAllowed, true);
    assert.equal(transferstatusCode, ALLOWED);
    assert.equal(transferapplicationCode, ALLOWED_APPLICATION_CODE);

    const {
      allowed: transferFrmAllowed,
      statusCode: transferFrmstatusCode,
      applicationCode: transferFrmapplicationCode,
    } = await this.moderator.verifyTransferFrom(sender, recipient, owner, 100, EMPTY_BYTES);
    assert.equal(transferFrmAllowed, true);
    assert.equal(transferFrmstatusCode, ALLOWED);
    assert.equal(transferFrmapplicationCode, ALLOWED_APPLICATION_CODE);
  });

  it('moderators should be able to set permissions for send and receive simultaneously', async () => {
    const investor = sender;
    const sendAllowed = true;
    const sendTime = 0;
    const receiveAllowed = true;
    const receiveTime = 0;
    const expiryTime = FAR_FUTURE_DATE;

    const result = await this.moderator.setPermission(
      investor,
      sendAllowed,
      sendTime,
      receiveAllowed,
      receiveTime,
      expiryTime,
      { from: moderatorRole },
    );
    assertEvent(result, {
      event: 'PermissionChanged',
      args: {
        investor,
        sendAllowed,
        sendTime,
        receiveAllowed,
        receiveTime,
        expiryTime,
        moderator: moderatorRole,
      },
    }, 'A PermissionChanged event is emitted.');

    const sendPermission = await this.moderator.canSend(investor);
    assert.equal(sendPermission, true);

    const receivePermission = await this.moderator.canReceive(investor);
    assert.equal(receivePermission, true);

    const {
      allowed: issueAllowed,
      statusCode: issuestatusCode,
      applicationCode: issueapplicationCode,
    } = await this.moderator.verifyIssue(recipient, 100, EMPTY_BYTES);
    assert.equal(issueAllowed, true);
    assert.equal(issuestatusCode, ALLOWED);
    assert.equal(issueapplicationCode, ALLOWED_APPLICATION_CODE);

    const {
      allowed: transferAllowed,
      statusCode: transferstatusCode,
      applicationCode: transferapplicationCode,
    } = await this.moderator.verifyTransfer(sender, recipient, 100, EMPTY_BYTES);
    assert.equal(transferAllowed, true);
    assert.equal(transferstatusCode, ALLOWED);
    assert.equal(transferapplicationCode, ALLOWED_APPLICATION_CODE);

    const {
      allowed: transferFrmAllowed,
      statusCode: transferFrmstatusCode,
      applicationCode: transferFrmapplicationCode,
    } = await this.moderator.verifyTransferFrom(sender, recipient, owner, 100, EMPTY_BYTES);
    assert.equal(transferFrmAllowed, true);
    assert.equal(transferFrmstatusCode, ALLOWED);
    assert.equal(transferFrmapplicationCode, ALLOWED_APPLICATION_CODE);
  });

  it('moderators should be able to renounce their role', async () => {
    const result = await this.moderator.renounceModerator({ from: moderatorRole });
    assertEvent(result, {
      event: 'ModeratorRemoved',
      args: {
        account: moderatorRole,
      },
    }, 'A ModeratorRemoved event is emitted.');
    const status = await this.moderator.isModerator(moderatorRole);
    assert.equal(status, false);
  });

  it('moderators who have renounced should NOT be able to set permissions', async () => {
    const investor = sender;
    const sendAllowed = true;
    const sendTime = 0;
    const receiveAllowed = false;
    const receiveTime = 0;
    const expiryTime = FAR_FUTURE_DATE;

    await expectThrow(this.moderator.setPermission(
      investor,
      sendAllowed,
      sendTime,
      receiveAllowed,
      receiveTime,
      expiryTime,
      { from: moderatorRole },
    ));
  });
});
