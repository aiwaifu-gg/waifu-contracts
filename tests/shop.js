/*
Test delegation with history
*/
const { parseEther, formatEther, defaultAbiCoder } = require("ethers/utils");
const { expect } = require("chai");
const {
  loadFixture,
  mine,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

function getAddLiquidityData(maxCurrency, deadline) {
  const addLiquidityObj = { maxCurrency, deadline };
  return ethers.AbiCoder.defaultAbiCoder().encode(
    [
      "bytes4",
      `tuple(
      uint256[] maxCurrency,
      uint256 deadline
    )`,
    ],
    ["0x82da2b73", addLiquidityObj]
  );
}

function getSellTokenData(recipient, minCurrency, deadline) {
  const obj = { recipient, minCurrency, deadline };
  return ethers.AbiCoder.defaultAbiCoder().encode(
    [
      "bytes4",
      `tuple(
        address recipient,
        uint256 minCurrency,
        uint256 deadline
      )`,
    ],
    ["0xade79c7a", obj]
  );
}

function getRemoveLiqData(minCurrency, minTokens, deadline) {
  const obj = { minCurrency, minTokens, deadline };
  return ethers.AbiCoder.defaultAbiCoder().encode(
    [
      "bytes4",
      `tuple(
        uint256[] minCurrency,
        uint256[] minTokens,
        uint256 deadline
      )`,
    ],
    ["0x5c0bf259", obj]
  );
}
describe("Shop", function () {
  const deadline = Math.floor(Date.now() / 1000) + 100000;

  async function deployBaseContracts() {
    const [deployer] = await ethers.getSigners();

    const waifuToken = await ethers.deployContract("WaifuToken", [
      {
        defaultAdmin: deployer.address,
        supplyRecipient: deployer.address,
        totalSupply: 1000000000,
        name: "WAIFU",
        symbol: "$WAIFU",
      },
      {
        projectBuyTaxBasisPoints: "500",
        projectSellTaxBasisPoints: "500",
        projectTaxRecipient: deployer.address,
      },
    ]);
    await waifuToken.waitForDeployment();

    const ingredients = await ethers.deployContract(
      "Ingredients",
      [deployer.address, deployer.address, "https://poc.virtuals.io"],
      {}
    );
    await ingredients.waitForDeployment();

    const shop = await ethers.deployContract(
      "Shop",
      [ingredients.target, waifuToken.target, "https://poc.virtuals.io"],
      {}
    );
    await shop.waitForDeployment();

    return { waifuToken, ingredients, shop };
  }

  async function deployWithLiquidity() {
    const contracts = await deployBaseContracts();
    const { waifuToken, ingredients, shop } = contracts;

    const [deployer, operator] = await ethers.getSigners();
    await waifuToken.transfer(operator.address, parseEther("300"));
    await waifuToken.connect(operator).approve(shop.target, parseEther("300"));
    await ingredients.connect(operator).setApprovalForAll(shop.target, true);
    await ingredients.mint(operator.address, 1, 100, "0x");
    await ingredients.mint(operator.address, 2, 200, "0x");
    await ingredients.mint(operator.address, 3, 300, "0x");

    await ingredients
      .connect(operator)
      .safeBatchTransferFrom(
        operator.address,
        shop.target,
        [1, 2, 3],
        [100, 200, 300],
        getAddLiquidityData(
          [parseEther("100"), parseEther("100"), parseEther("100")],
          deadline
        )
      );

    return contracts;
  }

  before(async function () {
    const signers = await ethers.getSigners();
    this.accounts = signers.map((signer) => signer.address);
    this.signers = signers;
  });

  it("should be able to add liquidity", async function () {
    const { waifuToken, ingredients, shop } = await loadFixture(
      deployBaseContracts
    );
    const [deployer, operator] = this.signers;
    await waifuToken.transfer(operator.address, parseEther("300"));
    await waifuToken.connect(operator).approve(shop.target, parseEther("300"));
    await ingredients.connect(operator).setApprovalForAll(shop.target, true);
    await ingredients.mint(operator.address, 1, 100, "0x");
    await ingredients.mint(operator.address, 2, 200, "0x");
    await ingredients.mint(operator.address, 3, 300, "0x");

    const tx = ingredients
      .connect(operator)
      .safeBatchTransferFrom(
        operator.address,
        shop.target,
        [1, 2, 3],
        [100, 200, 300],
        getAddLiquidityData(
          [parseEther("100"), parseEther("100"), parseEther("100")],
          deadline
        )
      );
    await expect(tx).to.be.fulfilled;
    expect(await waifuToken.balanceOf(shop.target)).to.equal(parseEther("300"));
    expect(await ingredients.balanceOf(shop.target, 1)).to.equal(100n);
    expect(await ingredients.balanceOf(shop.target, 2)).to.equal(200n);
    expect(await ingredients.balanceOf(shop.target, 3)).to.equal(300n);
    expect(await waifuToken.balanceOf(operator.address)).to.equal(0n);
    expect(await ingredients.balanceOf(operator.address, 1)).to.equal(0n);
    expect(await ingredients.balanceOf(operator.address, 2)).to.equal(0n);
    expect(await ingredients.balanceOf(operator.address, 3)).to.equal(0n);

    /*
    Tokens price:
    1: 1
    2: 0.5
    3: 0.33333
    */
  });

  it("should be able to buy token", async function () {
    const { waifuToken, ingredients, shop } = await loadFixture(
      deployWithLiquidity
    );
    const [deployer, operator, buyer] = this.signers;
    await waifuToken.transfer(buyer.address, parseEther("100"));
    await waifuToken.connect(buyer).approve(shop.target, parseEther("100"));

    const tx = shop
      .connect(buyer)
      .buyTokens([1], [50], parseEther("100"), deadline, buyer.address);
    await expect(tx).to.be.fulfilled;

    expect(await waifuToken.balanceOf(shop.target)).to.equal(parseEther("400"));
    expect(await ingredients.balanceOf(shop.target, 1)).to.equal(50n);
    expect(await ingredients.balanceOf(shop.target, 2)).to.equal(200n);
    expect(await ingredients.balanceOf(shop.target, 3)).to.equal(300n);
    expect(await waifuToken.balanceOf(operator.address)).to.equal(0n);
    expect(await ingredients.balanceOf(operator.address, 1)).to.equal(0n);
    expect(await ingredients.balanceOf(operator.address, 2)).to.equal(0n);
    expect(await ingredients.balanceOf(operator.address, 3)).to.equal(0n);
  });

  it("should be able to sell token", async function () {
    const { waifuToken, ingredients, shop } = await loadFixture(
      deployWithLiquidity
    );
    const [deployer, operator, buyer, seller] = this.signers;
    await ingredients.mint(seller.address, 1, 50, "0x");
    await ingredients.connect(seller).setApprovalForAll(shop.target, true);

    const tx = ingredients
      .connect(seller)
      .safeBatchTransferFrom(
        seller.address,
        shop.target,
        [1],
        [50],
        getSellTokenData(seller.address, parseEther("1"), deadline)
      );

    await expect(tx).to.be.fulfilled;
    expect(
      parseFloat(formatEther(await waifuToken.balanceOf(shop.target))).toFixed(
        2
      )
    ).to.equal("266.67");
    expect(await ingredients.balanceOf(shop.target, 1)).to.equal(150n);
    expect(await ingredients.balanceOf(shop.target, 2)).to.equal(200n);
    expect(await ingredients.balanceOf(shop.target, 3)).to.equal(300n);
    expect(
      parseFloat(
        formatEther(await waifuToken.balanceOf(seller.address))
      ).toFixed(2)
    ).to.equal("33.33");
    expect(
      (await waifuToken.balanceOf(seller.address)) +
        (await waifuToken.balanceOf(shop.target))
    ).to.equal(parseEther("300"));
    expect(await ingredients.balanceOf(seller.address, 1)).to.equal(0n);
    expect(await ingredients.balanceOf(seller.address, 2)).to.equal(0n);
    expect(await ingredients.balanceOf(seller.address, 3)).to.equal(0n);
  });

  it("should be able to remove liquidity after transactions", async function () {
    const { waifuToken, ingredients, shop } = await loadFixture(
      deployWithLiquidity
    );
    const [deployer, operator, buyer, seller] = this.signers;
    await ingredients.mint(seller.address, 1, 50, "0x");
    await ingredients.connect(seller).setApprovalForAll(shop.target, true);

    await ingredients
      .connect(seller)
      .safeTransferFrom(
        seller.address,
        shop.target,
        1,
        50,
        getSellTokenData(seller.address, parseEther("1"), deadline)
      );

    expect(await shop.balanceOf(operator.address, 1)).to.equal(
      parseEther("100")
    );
    expect(await shop.balanceOf(operator.address, 2)).to.equal(
      parseEther("100")
    );
    expect(await shop.balanceOf(operator.address, 3)).to.equal(
      parseEther("100")
    );

    // Redeem
    await shop.connect(operator).setApprovalForAll(shop.target, true);
    const tx = shop
      .connect(operator)
      .safeBatchTransferFrom(
        operator.address,
        shop.target,
        [1, 2, 3],
        [parseEther("100"), parseEther("100"), parseEther("100")],
        getRemoveLiqData(
          [parseEther("1"), parseEther("1"), parseEther("1")],
          [1n, 1n, 1n],
          deadline
        )
      );
    await expect(tx).to.be.fulfilled;
    expect(await waifuToken.balanceOf(shop.target)).to.equal(0n);
    expect(await ingredients.balanceOf(shop.target, 1)).to.equal(0n);
    expect(await ingredients.balanceOf(shop.target, 2)).to.equal(0n);
    expect(await ingredients.balanceOf(shop.target, 3)).to.equal(0n);
    expect(parseFloat(formatEther(await waifuToken.balanceOf(operator.address))).toFixed(2)).to.equal("266.67");
    expect(await ingredients.balanceOf(operator.address, 1)).to.equal(150n);
    expect(await ingredients.balanceOf(operator.address, 2)).to.equal(200n);
    expect(await ingredients.balanceOf(operator.address, 3)).to.equal(300n);
  });
});
