import { ethers } from "hardhat";
const deployParams = require("./arguments/baseWaifu.js");

(async () => {
  try {
    const nft = await ethers.deployContract("BaseAIWaifu", deployParams);
    console.log("AIWaifu deployed to:", nft.target);
  } catch (e) {
    console.log(e);
  }
})();
