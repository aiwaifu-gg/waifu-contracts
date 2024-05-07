import { ethers } from "hardhat";
const deployParams = require("./arguments/baseReward.js");

(async () => {
  try {
    const contract = await ethers.deployContract("BaseReward", deployParams);
    console.log("Reward deployed to:", contract.target);
  } catch (e) {
    console.log(e);
  }
})();
