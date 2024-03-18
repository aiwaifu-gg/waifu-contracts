import { ethers, upgrades } from "hardhat";
const deployParams = require("./arguments/staking.js");

(async () => {
  try {
    const Staking = await ethers.getContractFactory("Staking");
    const staking = await upgrades.deployProxy(Staking, deployParams);
    console.log("Staking deployed to:", staking.target);
  } catch (e) {
    console.log(e);
  }
})();
