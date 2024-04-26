import { ethers } from "hardhat";
const tokenParams = require("./arguments/token.js");

(async () => {
  try {
    const token = await ethers.deployContract(
      "contracts/base/token/WaifuToken.sol:WaifuToken",
      tokenParams
    );
    console.log("$WAIFU deployed to:", token.target);
  } catch (e) {
    console.log(e);
  }
})();
