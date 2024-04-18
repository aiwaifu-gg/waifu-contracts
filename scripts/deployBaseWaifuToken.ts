import { ethers } from "hardhat";
const tokenParams = require("./arguments/basewaifu.js");

(async () => {
  try {
    const token = await ethers.deployContract("BaseWaifuToken", tokenParams);
    console.log("$WAIFU (BASE) deployed to:", token.target);
  } catch (e) {
    console.log(e);
  }
})();
