import { parseEther } from "ethers";
import { ethers, upgrades } from "hardhat";
const deployParams = require("./arguments/gm.js");
const levelParams = require("./arguments/levelcost.js");

(async () => {
  try {
    const GameManager = await ethers.getContractFactory(
      "contracts/blast/game/GameManager.sol:GameManager"
    );
    const gm = await upgrades.deployProxy(GameManager, deployParams, {
      initialAdmin: process.env.ADMIN,
    });

    // Set costs
    console.log("GameManager deployed to:", gm.target);
    await gm.updateLevelMap([1, 2, 3], [3, 1, 2]);
    await gm.updateTemptMap([1, 2, 3], [3, 1, 2]);

    const levels = Array(30)
      .fill(0)
      .map((_, index) => index + 1);
    const costs = levelParams.map((o) => ({
      ingredients: o.ingredients,
      tokens: parseEther(o.tokens),
      duration: o.duration,
    }));

    await gm.updateLevelCost(levels, costs);
    await gm.grantRole(
      await gm.ORACLE_ROLE(),
      process.env.BACKEND_OPERATOR_WALLET
    );
    await gm.grantRole(await gm.DEFAULT_ADMIN_ROLE(), process.env.ADMIN);
    await gm.renounceRole(await gm.DEFAULT_ADMIN_ROLE(), process.env.DEPLOYER);
  } catch (e) {
    console.log(e);
  }
})();
