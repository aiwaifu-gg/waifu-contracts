// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import "../interface/IBlastPoints.sol";

contract Staking is Initializable, PausableUpgradeable, OwnableUpgradeable {
    mapping(address => uint256) internal _balances;
    mapping(address => uint256) internal _points;
    mapping(address => uint256) public lastUpdatedAt;
    mapping(address => uint256) public multiplierStart;

    uint256 public holdingStartTime;
    uint256 public holdingEndTime;

    IERC20 public TOKEN;

    uint256 private constant _HOUR = 3_600;
    uint256 private constant _DAY = _HOUR * 24;
    uint256 private constant _MONTH = _DAY * 30;

    uint256 private constant _BASIS_POINTS = 10_000;
    uint256 private constant _MULTIPLIER_PER_MONTH = 5_000; // bips
    uint256 private constant _BASE_MULTIPLIER = 10_000; // bips

    mapping(address => uint256) public earlyHolderBonus;

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);

    error InsufficientBalance();

    struct BlastPointParams {
        address BlastPointsAddress;
        address _pointsOperator;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address initialOwner,
        address token,
        BlastPointParams memory blastParams
    ) external initializer {
        __Ownable_init(initialOwner);
        __Pausable_init();
        _pause();

        TOKEN = IERC20(token);
        holdingEndTime = type(uint256).max;
        IBlastPoints(blastParams.BlastPointsAddress).configurePointsOperator(
            blastParams._pointsOperator
        );
    }

    /*//////////////////////////////
            ADMIN FUNCTIONS
    //////////////////////////////*/

    /**
     * @notice Initiate the holding period (admin only)
     */
    function startHolding() external onlyOwner {
        require(holdingStartTime == 0);
        holdingStartTime = block.timestamp;
        _unpause();
    }

    /**
     * @notice End the holding period (admin only)
     */
    function endHolding() external onlyOwner {
        require(holdingStartTime != 0 && holdingEndTime == type(uint256).max);
        holdingEndTime = block.timestamp;
        _pause();
    }

    /**
     * @notice Pause deposits (admin only)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause deposits (admin only)
     */
    function unpause() external onlyOwner {
        require(holdingStartTime != 0 && holdingEndTime == type(uint256).max);
        _unpause();
    }

    /**
     * @notice Initiate the holding period (admin only)
     */
    function setEarlyHolderBonus(
        address[] memory accounts,
        uint256[] memory bonuses
    ) external onlyOwner {
        require(holdingStartTime == 0);
        require(accounts.length == bonuses.length);
        for (uint256 i = 0; i < accounts.length; i++) {
            earlyHolderBonus[accounts[i]] = bonuses[i];
        }
    }

    /*//////////////////////////////
                 VIEWS
    //////////////////////////////*/

    /**
     * @notice Gets the balance of the user deposits
     * @param user User address
     * @return User deposit balance
     */
    function balanceOf(address user) external view returns (uint256) {
        return _balances[user];
    }

    /**
     * @notice Gets the current amount of points earned by the user (including pending points)
     * @param user User address
     * @return User points
     */
    function pointsOf(address user) public view returns (uint256) {
        return _points[user] + _computePendingPoints(user);
    }

    /**
     * @notice Gets the current points multiplier of the user
     * @param user User address
     * @return User multiplier
     */
    function multiplierOf(address user) public view returns (uint256) {
        uint256 _multiplierStart = multiplierStart[user];
        if (_multiplierStart == 0 || _balances[user] == 0) {
            return _BASE_MULTIPLIER;
        }
        return
            _BASE_MULTIPLIER +
            (_MULTIPLIER_PER_MONTH *
                (min(block.timestamp, holdingEndTime) - _multiplierStart)) /
            _MONTH;
    }

    /**
     * @notice Gets the current score of the user
     * @param user User address
     * @return User score
     */
    function scoreOf(address user) external view returns (uint256) {
        return (pointsOf(user) * multiplierOf(user)) / _BASIS_POINTS;
    }

    /*//////////////////////////////
        DEPOSITS AND WITHDRAWS 
    //////////////////////////////*/

    /**
     * @notice Deposit TOKEN
     * @param amount Amount of TOKEN to deposit
     */
    function deposit(uint256 amount) external {
        require(amount > 0);
        _deposit(msg.sender, amount);

        TOKEN.transferFrom(msg.sender, address(this), amount);
    }

    /**
     * @notice Withdraw TOKEN and enforce multiplier penalty
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 amount) external {
        _checkpoint(msg.sender);

        uint256 balance = _balances[msg.sender];
        if (balance < amount) {
            revert InsufficientBalance();
        }
        _decreaseMultiplier(msg.sender, amount);
        unchecked {
            _balances[msg.sender] = balance - amount;
        }

        TOKEN.transfer(msg.sender, amount);

        emit Withdraw(msg.sender, amount);
    }

    /**
     * @notice Deposit TOKEN from user
     * @param user User address
     * @param amount Amount of TOKEN to deposit
     */
    function _deposit(address user, uint256 amount) internal whenNotPaused {
        if (multiplierStart[user] == 0) {
            multiplierStart[user] = block.timestamp;
        }
        if (lastUpdatedAt[user] == 0) {
            lastUpdatedAt[user] = block.timestamp;
        }
        _checkpoint(user);

        _balances[user] += amount;

        emit Deposit(user, amount);
    }

    /**
     * @notice Record earned points and update the last checkpoint time; must be called on every deposit and withdrawal
     * @param user User address
     */
    function _checkpoint(address user) internal {
        _points[user] += _computePendingPoints(user);
        lastUpdatedAt[user] = block.timestamp;
    }

    /**
     * @notice Compute the pending points that have been earned but not recorded since the last checkpoint
     * @param user User address
     * @return points Amount of earned unrecorded points
     */
    function _computePendingPoints(
        address user
    ) internal view returns (uint256) {
        uint256 _holdingEndTime = holdingEndTime;
        uint256 start = min(lastUpdatedAt[user], _holdingEndTime);
        uint256 end = min(block.timestamp, _holdingEndTime);
        return
            (_balances[user] *
                ((_BASIS_POINTS + earlyHolderBonus[user]) * (end - start))) /
            (_HOUR * _BASIS_POINTS);
    }

    /**
     * @notice Penalize mutiplier for early withdrawal by increasing the multiplier start time
     * @dev Penalty is equal to the portion of the balance being withdrawn; balance should be decreased AFTER this function
     * @param user User address
     * @param amount Withdrawal amount
     */
    function _decreaseMultiplier(address user, uint256 amount) internal {
        uint256 balance = _balances[user];
        if (block.timestamp < holdingEndTime) {
            if (amount == balance) {
                multiplierStart[user] = 0;
            } else {
                uint256 _multiplierStart = multiplierStart[user];
                uint256 penaltyTime = (amount *
                    (block.timestamp - _multiplierStart)) / balance;
                multiplierStart[user] = _multiplierStart + penaltyTime;
            }
        }
    }

    /*////////////////////////////
           HELPER FUNCTIONS
    ////////////////////////////*/

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
