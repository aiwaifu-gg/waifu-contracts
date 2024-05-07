module.exports = [
  {
    defaultAdmin: process.env.DEPLOYER,
    name: "WAI",
    symbol: "WAI",
  },
  {
    projectBuyTaxBasisPoints: "500",
    projectSellTaxBasisPoints: "500",
    projectTaxRecipient: process.env.PROJECT_TAX_RECIPIENT,
  }
];
