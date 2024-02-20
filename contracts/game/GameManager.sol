// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "./IAIWaifu.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

contract GameManager is Initializable, AccessControlUpgradeable {
    using SafeERC20 for IERC20;

    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    address public ingredientNft;
    address public waifuNft;
    address public token;

    struct LevelCost {
        uint256 ingredients;
        uint256 tokens;
        uint24 duration;
    }

    mapping(uint256 ingredientId => uint256 updradeId) public levelUpMap;
    mapping(uint8 level => LevelCost) public levelCosts;
    mapping(uint256 waifuId => uint256 levelCompleteAt) private _levelCooldown;

    // Prevent double spending of food and gifts
    mapping(bytes32 hash => bool) private _waifuHashes;

    uint8 public maxLevel;
    uint256 private _nextFoodId;
    uint256 private _nextGiftId;

    modifier isActive(uint256 tokenId) {
        require(IAIWaifu(waifuNft).isAlive(tokenId), "Waifu is not dead");
        require(
            block.timestamp > _levelCooldown[tokenId],
            "Waifu is leveling up"
        );
        _;
    }

    event LevelUpMapUpdated(uint256 ingredientId, uint256 updradeId);
    event LevelUpCostUpdated(
        uint8 level,
        uint256 ingredients,
        uint256 tokens,
        uint24 duration
    );
    event MaxLevelUpdated(uint8 maxLevel);
    event Feed(uint256 waifuId, uint256 foodId);
    event Gift(uint256 waifuId, uint256 giftId);
    event Eaten(
        uint256 waifuId,
        uint256 foodId,
        uint256 amount,
        uint256 replenishAmount
    );
    event GiftOpened(
        uint256 waifuId,
        uint256 giftId,
        uint256 amount,
        uint256 replenishAmount
    );
    event WithdrawnToken(address indexed receiver, uint256 amount);
    event WithdrawnIngredient(
        address indexed receiver,
        uint256 id,
        uint256 amount
    );
    event LevelUp(uint256 waifuId, uint8 level);

    uint256 private _nextTemptId;
    mapping(uint256 ingredientId => uint256 temptIngredientId) public temptMap;
    mapping(uint256 waifuId => uint256 cooldown) private _cooldownByWaifu;
    mapping (address => uint256 cooldown) private _cooldownByAddress;
    uint16 public defendCooldown;
    uint16 public temptCooldown;
    event TemptCooldownUpdated(uint16 defendCooldown, uint16 temptCooldown);
    event TemptMapUpdated(uint256 ingredientId, uint256 temptIngredientId);
    event Tempted(
        address indexed account,
        uint256 waifuId,
        uint256 temptId,
        uint256 wager,
        uint256 defendAmount
    );
    event TemptResult(
        uint256 temptId,
        uint256 waifuId,
        bool success,
        uint16 ingredientScore,
        uint16 flirtScore
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address defaultAdmin,
        uint8 maxLevel_,
        address token_,
        address ingredientNft_,
        address waifuNft_
    ) public initializer {
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _nextFoodId = 1;
        _nextGiftId = 1;
        _nextTemptId = 1;
        maxLevel = maxLevel_;
        token = token_;
        waifuNft = waifuNft_;
        ingredientNft = ingredientNft_;
    }

    function updateLevelMap(
        uint8[] memory ingredients,
        uint8[] memory updrades
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(ingredients.length == updrades.length, "Invalid input");
        for (uint8 i = 0; i < ingredients.length; i++) {
            levelUpMap[ingredients[i]] = updrades[i];
            emit LevelUpMapUpdated(ingredients[i], updrades[i]);
        }
    }

    function updateTemptMap(
        uint8[] memory ingredients,
        uint8[] memory tempts
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(ingredients.length == tempts.length, "Invalid input");
        for (uint8 i = 0; i < ingredients.length; i++) {
            temptMap[ingredients[i]] = tempts[i];
            emit TemptMapUpdated(ingredients[i], tempts[i]);
        }
    }

    function updateLevelCost(
        uint8[] memory levels,
        LevelCost[] memory costs
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(levels.length == costs.length, "Invalid input");
        for (uint8 i = 0; i < levels.length; i++) {
            levelCosts[levels[i]] = costs[i];
            emit LevelUpCostUpdated(
                levels[i],
                costs[i].ingredients,
                costs[i].tokens,
                costs[i].duration
            );
        }
    }

    function updateMaxLevel(
        uint8 _maxLevel
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        maxLevel = _maxLevel;
        emit MaxLevelUpdated(_maxLevel);
    }

    function updateTemptCooldown(
        uint16 defendCooldown_,
        uint16 temptCooldown_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        defendCooldown = defendCooldown_;
        temptCooldown = temptCooldown_;
        emit TemptCooldownUpdated(defendCooldown_, temptCooldown_);
    }

    function _feed(uint256 waifuId) internal isActive(waifuId) {
        uint256 foodId = _nextFoodId++;
        emit Feed(waifuId, foodId);
    }

    function feed(uint256 waifuId) public {
        require(
            _msgSender() == IERC721(waifuNft).ownerOf(waifuId),
            "Not the owner of the waifu"
        );
        return _feed(waifuId);
    }

    function feedBySig(
        uint256 waifuId,
        uint256 nonce,
        bytes memory signature
    ) public {
        bytes32 hash = keccak256(abi.encodePacked(waifuId, "f", nonce));
        require(!_waifuHashes[hash], "Nonce already used");
        SignatureChecker.isValidSignatureNow(
            IERC721(waifuNft).ownerOf(waifuId),
            hash,
            signature
        );
        _waifuHashes[hash] = true;
        return _feed(waifuId);
    }

    function _gift(uint256 waifuId) internal isActive(waifuId) {
        uint256 giftId = _nextGiftId++;
        emit Gift(waifuId, giftId);
    }

    function gift(uint256 waifuId) public {
        require(
            _msgSender() == IERC721(waifuNft).ownerOf(waifuId),
            "Not the owner of the waifu"
        );
        return _gift(waifuId);
    }

    function giftBySig(
        uint256 waifuId,
        uint256 nonce,
        bytes memory signature
    ) public {
        bytes32 hash = keccak256(abi.encodePacked(waifuId, "g", nonce));
        require(!_waifuHashes[hash], "Nonce already used");
        SignatureChecker.isValidSignatureNow(
            IERC721(waifuNft).ownerOf(waifuId),
            hash,
            signature
        );
        _waifuHashes[hash] = true;
        return _gift(waifuId);
    }

    function eat(
        uint256 waifuId,
        uint256 foodId,
        uint256 amount,
        uint256 replenishAmount
    ) public isActive(waifuId) onlyRole(ORACLE_ROLE) {
        address account = IERC721(waifuNft).ownerOf(waifuId);
        require(
            IERC20(token).balanceOf(account) >= amount,
            "Insufficient token balance"
        );
        require(amount > 0, "Invalid amount");
        IERC20(token).safeTransferFrom(account, address(this), amount);
        emit Eaten(waifuId, foodId, amount, replenishAmount);
    }

    function openGift(
        uint256 waifuId,
        uint256 giftId,
        uint256 amount,
        uint256 replenishAmount
    ) public isActive(waifuId) onlyRole(ORACLE_ROLE) {
        address account = IERC721(waifuNft).ownerOf(waifuId);
        require(
            IERC20(token).balanceOf(account) >= amount,
            "Insufficient token balance"
        );
        require(amount > 0, "Invalid amount");
        IERC20(token).safeTransferFrom(account, address(this), amount);
        emit GiftOpened(waifuId, giftId, amount, replenishAmount);
    }

    function withdrawToken(
        address receiver,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(token).safeTransfer(receiver, amount);
        emit WithdrawnToken(receiver, amount);
    }

    function levelUp(uint256 waifuId) external isActive(waifuId) {
        address sender = _msgSender();
        require(
            sender == IERC721(waifuNft).ownerOf(waifuId),
            "Not the owner of the waifu"
        );

        IAIWaifu.Waifu memory waifu = IAIWaifu(waifuNft).waifu(waifuId);
        require(waifu.level < maxLevel, "Max level reached");
        uint8 nextLevel = waifu.level + 1;
        LevelCost memory levelCost = levelCosts[nextLevel];

        // Spend token
        require(
            IERC20(token).balanceOf(sender) >= levelCost.tokens,
            "Insufficient token balance"
        );
        IERC20(token).safeTransferFrom(sender, address(this), levelCost.tokens);

        // Spend ingredients
        uint256 levelUpIngredientId = levelUpMap[waifu.ingredientId];
        require(
            ERC1155Burnable(ingredientNft).balanceOf(
                sender,
                levelUpIngredientId
            ) >= levelCost.ingredients,
            "Insufficient ingredients"
        );
        ERC1155Burnable(ingredientNft).burn(
            sender,
            levelUpIngredientId,
            levelCost.ingredients
        );

        // Level up
        IAIWaifu(waifuNft).setLevel(waifuId, nextLevel);
        _levelCooldown[waifuId] = uint256(block.timestamp + levelCost.duration);
        emit LevelUp(waifuId, nextLevel);
    }

    // Admin functions to save any accidentally sent tokens
    function withdrawETH(
        uint256 amount_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        (bool success, ) = _msgSender().call{value: amount_}("");
        if (!success) {
            revert("Transfer failed");
        }
    }

    function withdrawERC20(
        address token_,
        uint256 amount_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(token_).safeTransfer(_msgSender(), amount_);
    }

    function tempt(uint256 waifuId, uint256 wager) external isActive(waifuId) {
        address account = _msgSender();
        require(
            _cooldownByWaifu[waifuId] < block.timestamp,
            "Waifu is on cooldown"
        );
        require(
            _cooldownByAddress[account] < block.timestamp,
            "Account is on cooldown"
        );
        IAIWaifu.Waifu memory waifu = IAIWaifu(waifuNft).waifu(waifuId);
        ERC1155Burnable ingredientContract = ERC1155Burnable(ingredientNft);
        uint256 temptIngredientId = temptMap[waifu.ingredientId];
        require(
            ingredientContract.balanceOf(account, temptIngredientId) >= wager,
            "Insufficient ingredient"
        );
        uint256 temptId = _nextTemptId++;
        ingredientContract.burn(account, temptIngredientId, wager);

        address defender = IERC721(waifuNft).ownerOf(waifuId);
        uint256 defendAmount = ingredientContract.isApprovedForAll(
            defender,
            address(this)
        )
            ? ingredientContract.balanceOf(defender, waifu.ingredientId)
            : 0;
        if (defendAmount > 0) {
            ingredientContract.burn(
                defender,
                waifu.ingredientId,
                Math.min(defendAmount, wager)
            );
        }

        _cooldownByWaifu[waifuId] = block.timestamp + defendCooldown;
        _cooldownByAddress[account] = block.timestamp + temptCooldown;

        emit Tempted(account, waifuId, temptId, wager, defendAmount);
    }

    function temptResult(
        uint256 temptId,
        uint256 waifuId,
        bool success,
        uint16 ingredientScore,
        uint16 flirtScore
    ) external onlyRole(ORACLE_ROLE) {
        if (success) {
            IAIWaifu waifuContract = IAIWaifu(waifuNft);
            IAIWaifu.Waifu memory waifu = waifuContract.waifu(waifuId);
            waifuContract.setHealth(waifuId, waifu.health - 1, waifu.maxHealth);
        }
        emit TemptResult(
            temptId,
            waifuId,
            success,
            ingredientScore,
            flirtScore
        );
    }
}
