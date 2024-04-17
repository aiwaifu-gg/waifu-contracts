import { ethers } from "hardhat";
const tokenParams = require("./arguments/baseToken.js");

(async () => {
  try {
    const token = await ethers.deployContract("BaseWaifuToken", tokenParams);
    console.log("$WAIFU deployed to:", token.target);
  } catch (e) {
    console.log(e);
  }
})();
