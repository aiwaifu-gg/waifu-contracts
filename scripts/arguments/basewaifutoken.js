module.exports = [
  {
    defaultAdmin: process.env.DEPLOYER,
    name: "IAW",
    symbol: "IAW",
  },
  {
    projectBuyTaxBasisPoints: "500",
    projectSellTaxBasisPoints: "500",
    projectTaxRecipient: process.env.PROJECT_TAX_RECIPIENT,
  }
];