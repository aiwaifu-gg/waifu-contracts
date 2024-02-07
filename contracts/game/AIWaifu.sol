// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./IAIWaifu.sol";

contract AIWaifu is
    IAIWaifu,
    ERC721,
    ERC721Enumerable,
    ERC721URIStorage,
    AccessControl
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant GAME_MANAGER_ROLE = keccak256("GAME_MANAGER_ROLE");

    uint256 private _nextTokenId;

    mapping(uint256 tokenId => Waifu) private _waifus;

    constructor(address defaultAdmin) ERC721("Waifu", "WAI") {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(MINTER_ROLE, defaultAdmin);
        _nextTokenId = 1;
    }

    function safeMint(
        address to,
        string memory uri,
        uint8 initialHealth,
        uint256 ingredientId
    ) public onlyRole(MINTER_ROLE) {
        uint256 tokenId = _nextTokenId++;
        Waifu memory newWaifu = Waifu({
            health: initialHealth,
            maxHealth: initialHealth,
            level: 0,
            ingredientId: ingredientId
        });
        _waifus[tokenId] = newWaifu;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    function updateTokenURI(
        uint256 tokenId,
        string memory uri
    ) public onlyRole(MINTER_ROLE) {
        _setTokenURI(tokenId, uri);
    }

    function isAlive(uint256 tokenId) public view returns (bool) {
        return _waifus[tokenId].health > 0;
    }

    function waifu(uint256 tokenId) public view returns (Waifu memory) {
        return _waifus[tokenId];
    }

    function setHealth(
        uint256 tokenId,
        uint8 health,
        uint8 maxHealth
    ) public onlyRole(GAME_MANAGER_ROLE) {
        require(health <= maxHealth, "Health cannot exceed maxHealth");
        _waifus[tokenId].health = health;
        emit HealthUpdated(tokenId, health, maxHealth);
    }

    function setLevel(
        uint256 tokenId,
        uint8 level
    ) public onlyRole(GAME_MANAGER_ROLE) {
        require(
            level > _waifus[tokenId].level,
            "Level must be higher than current"
        );
        _waifus[tokenId].level = level;
        emit LevelUp(tokenId, level);
    }

    // The following functions are overrides required by Solidity.

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
