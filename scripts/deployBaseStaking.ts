import { ethers, upgrades } from "hardhat";
const deployParams = require("./arguments/baseStaking.js");

(async () => {
  try {
    const Staking = await ethers.getContractFactory("BaseStaking");
    const staking = await upgrades.deployProxy(Staking, deployParams);
    console.log("Staking deployed to:", staking.target);
  } catch (e) {
    console.log(e);
  }
})();
