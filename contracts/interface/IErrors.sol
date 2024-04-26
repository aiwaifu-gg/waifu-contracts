// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IErrors {
    error CannotWithdrawThisToken();
    error LiquidityPoolMustBeAContractAddress();

    error LiquidityPoolCannotBeAddressZero();

    error TransferAmountExceedsBalance();

    error TransferFailed();

    error TransferFromZeroAddress();

    error TransferToZeroAddress();
}
