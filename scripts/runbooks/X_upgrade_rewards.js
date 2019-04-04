// To be run as a Migration

const PAYToken = artifacts.require('PAYToken'); // Mock
const TENXToken = artifacts.require('TENXToken');
const Rewards = artifacts.require('Rewards');
const RewardsV2 = artifacts.require('RewardsV2');

module.exports = async (deployer) => {
  const rewards = await Rewards.deployed();
  const rewardableToken = await TENXToken.deployed();
  const rewardsToken = await PAYToken.deployed();

  await rewardableToken.pause();
  await rewards.pause();

  // Deploys Rewards
  const rewardsV2 = await deployer.deploy(
    RewardsV2,
    rewardableToken.address,
    rewardsToken.address,
  );

  await rewards.reclaimRewards(); // For unrecoverable scenario
  await rewardableToken.setRewards(rewardsV2.address); // Link token with Rewards contract
  await rewardableToken.unpause();
};
