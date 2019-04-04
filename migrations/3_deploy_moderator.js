const BlacklistModerator = artifacts.require('BlacklistModerator');

module.exports = async (deployer) => {
  // Deploys blacklist moderator service
  await deployer.deploy(BlacklistModerator);
};
