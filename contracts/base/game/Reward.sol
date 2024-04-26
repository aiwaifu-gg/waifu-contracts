// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Reward is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    IERC20 public token;

    event NewReward(uint256 amount);
    event RewardClaimed(address receiver, uint256 amount, uint256 lovePoints);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address defaultAdmin, address token_) {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(ORACLE_ROLE, defaultAdmin);
        token = IERC20(token_);
    }

    function distributeReward(
        uint256 amount
    ) external onlyRole(ORACLE_ROLE) {
        token.safeTransferFrom(_msgSender(), address(this), amount);
        emit NewReward(amount);
    }

    function claimReward(
        address receiver,
        uint256 amount,
        uint256 lovePoints
    ) external onlyRole(ORACLE_ROLE) {
        token.safeTransfer(receiver, amount);
        emit RewardClaimed(receiver, amount, lovePoints);
    }
}
