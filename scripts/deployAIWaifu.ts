import { ethers } from "hardhat";
const deployParams = require("./arguments/waifu.js");

(async () => {
  try {
    const nft = await ethers.deployContract("AIWaifu", deployParams);
    console.log("AIWaifu deployed to:", nft.target);
  } catch (e) {
    console.log(e);
  }
})();
