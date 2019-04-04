const PAYToken = artifacts.require('PAYToken'); // Mock

module.exports = async (deployer) => {
  // Deploys PAYToken (mock contract for prototyping)
  await deployer.deploy(PAYToken);
};
