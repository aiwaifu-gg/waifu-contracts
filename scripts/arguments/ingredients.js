module.exports = [
  process.env.ADMIN,
  process.env.BACKEND_OPERATOR_WALLET,
  process.env.SHOP_FEE_RECIPIENT,
  200,
  process.env.INGREDIENTS_URI,
  {
    BlastPointsAddress: process.env.BLAST_POINT_ADDRSS,
    _pointsOperator: process.env.BLAST_OPERATOR
  }
];