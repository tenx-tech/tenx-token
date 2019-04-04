const IERC20 = artifacts.require('IERC20');
const PAYToken = artifacts.require('PAYToken'); // Mock
const TENXToken = artifacts.require('TENXToken');
const Rewards = artifacts.require('Rewards');


module.exports = async (deployer) => {
  const rewardableToken = await TENXToken.deployed();
  const payToken = await PAYToken.deployed(); // TODO: should be mainnet PAY token address
  const rewardsToken = await IERC20.at(payToken.address);

  // Deploys Rewards
  const rewards = await deployer.deploy(
    Rewards,
    rewardableToken.address,
    rewardsToken.address,
  );
  await rewardableToken.setRewards(rewards.address); // Link token with Rewards contract
};
