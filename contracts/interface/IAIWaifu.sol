// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IAIWaifu {
    struct Waifu {
        uint8 health;
        uint8 maxHealth;
        uint8 level;
        uint256 ingredientId;
    }

    event HealthUpdated(uint256 tokenId, uint8 health, uint8 maxHealth);
    event LevelUp(uint256 tokenId, uint8 level);

    function isAlive(uint256 tokenId) external view returns (bool);

    function waifu(uint256 tokenId) external view returns (Waifu memory);

    function setHealth(uint256 tokenId, uint8 health, uint8 maxHealth) external;

    function setLevel(uint256 tokenId, uint8 level) external;
}
