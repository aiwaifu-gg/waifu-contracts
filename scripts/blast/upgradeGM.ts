import { ethers, upgrades } from "hardhat";

(async () => {
  try {
    const GameManager = await ethers.getContractFactory("GameManager");
    const gm = await upgrades.upgradeProxy(process.env.GM, GameManager);
    console.log("Upgraded", gm.target)
    await gm.updateTemptMap([1, 2, 3], [3, 1, 2]);
  } catch (e) {
    console.log(e);
  }
})();
