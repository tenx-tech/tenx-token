const { expectThrow, assertEvent } = require('./helpers');

const Blacklistable = artifacts.require('BlacklistableMock.sol');


contract('Blacklistable', ([owner, moderator, other]) => {
  before(async () => {
    // Deploys moderator
    this.blacklistable = await Blacklistable.new();
  });

  it('should initialize correctly', async () => {
    const result = await this.blacklistable.isModerator(owner);
    assert.equal(result, true);
  });

  it('non-moderators should NOT be able to add new moderators', async () => {
    await expectThrow(this.blacklistable.addModerator(moderator, { from: moderator }));

    const result = await this.blacklistable.isModerator(moderator);
    assert.equal(result, false);
  });

  it('moderator should be able to add new moderators', async () => {
    await this.blacklistable.addModerator(moderator, { from: owner });
    const result = await this.blacklistable.isModerator(moderator);
    assert.equal(result, true);
  });

  it('onlyBlacklisted should NOT be callable when not blacklisted', async () => {
    const result = await this.blacklistable.isBlacklisted(other);
    assert.equal(result, false);

    await expectThrow(this.blacklistable.doSomethingElse({ from: other }));
  });

  it('onlyNotBlacklisted should be callable when not blacklisted', async () => {
    const result = await this.blacklistable.isBlacklisted(other);
    assert.equal(result, false);

    await this.blacklistable.doSomething({ from: other });
  });  

  it('non-moderators should NOT be able to blacklist', async () => {
    const isModerator = await this.blacklistable.isModerator(other);
    assert.equal(isModerator, false);

    await expectThrow(this.blacklistable.blacklist(moderator, { from: other }));
  });

  it('moderators should NOT be able to blacklist self', async () => {
    const isModerator = await this.blacklistable.isModerator(moderator);
    assert.equal(isModerator, true);

    await expectThrow(this.blacklistable.blacklist(moderator, { from: moderator }));
  });

  it('moderators should be able to blacklist accounts', async () => {
    const result = await this.blacklistable.blacklist(other, { from: moderator });
    assertEvent(result, {
      event: 'Blacklisted',
      args: {
        account: other,
      },
    }, 'A Blacklisted event is emitted.', 0);

    const isBlacklisted = await this.blacklistable.isBlacklisted(other);
    assert.equal(isBlacklisted, true);
  });

  it('onlyBlacklisted should be callable when blacklisted', async () => {
    const result = await this.blacklistable.isBlacklisted(other);
    assert.equal(result, true);

    await this.blacklistable.doSomethingElse({ from: other });
  });

  it('onlyNotBlacklisted should NOT be callable when blacklisted', async () => {
    const result = await this.blacklistable.isBlacklisted(other);
    assert.equal(result, true);

    await expectThrow(this.blacklistable.doSomething({ from: other }));
  });

  it('non-moderators should NOT be able to unblacklist', async () => {
    await this.blacklistable.blacklist(moderator, { from: owner });

    const isBlacklisted = await this.blacklistable.isBlacklisted(moderator);
    assert.equal(isBlacklisted, true);

    await expectThrow(this.blacklistable.unblacklist(moderator, { from: other }));
  });

  it('moderators should NOT be able to unblacklist self', async () => {
    await expectThrow(this.blacklistable.unblacklist(moderator, { from: moderator }));
  });

  it('moderators should be able to unblacklist accounts', async () => {
    const result = await this.blacklistable.unblacklist(other, { from: moderator });
    assertEvent(result, {
      event: 'Unblacklisted',
      args: {
        account: other,
      },
    }, 'An Unblacklisted event is emitted.', 0);

    const isBlacklisted = await this.blacklistable.isBlacklisted(other);
    assert.equal(isBlacklisted, false);
  });
});
