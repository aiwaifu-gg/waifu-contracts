import { ethers } from "hardhat";
const deployParams = require("./arguments/reward.js");

(async () => {
  try {
    const contract = await ethers.deployContract("Reward", deployParams);
    console.log("Reward deployed to:", contract.target);
  } catch (e) {
    console.log(e);
  }
})();
