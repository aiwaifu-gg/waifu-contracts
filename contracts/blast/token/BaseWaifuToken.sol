// SPDX-License-Identifier: MIT
// This is $WAI token on BASE chain, added mintable and burnable features to be compatible with bridging protocol
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../../interface/ERC20Custom.sol";

contract BaseWaifuToken is ERC20Custom, AccessControl {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;

    struct ERC20TaxParameters {
        uint256 projectBuyTaxBasisPoints;
        uint256 projectSellTaxBasisPoints;
        address projectTaxRecipient;
    }

    struct BaseParameters {
        address defaultAdmin;
        string name;
        string symbol;
    }

    uint256 internal constant BP_DENOM = 10000;

    EnumerableSet.AddressSet private _liquidityPools;
    bool internal _tokenHasTax;

    uint16 public projectBuyTaxBasisPoints;
    uint16 public projectSellTaxBasisPoints;
    address public projectTaxRecipient;

    event LiquidityPoolAdded(address addedPool);
    event LiquidityPoolRemoved(address removedPool);
    event ProjectTaxRecipientUpdated(address treasury);
    event ProjectTaxBasisPointsChanged(
        uint256 oldBuyBasisPoints,
        uint256 newBuyBasisPoints,
        uint256 oldSellBasisPoints,
        uint256 newSellBasisPoints
    );

    uint128 public projectTaxPendingSwap;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(
        BaseParameters memory baseParams,
        ERC20TaxParameters memory taxParams
    ) ERC20Custom(baseParams.name, baseParams.symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, baseParams.defaultAdmin);
        _tokenHasTax = _processTaxParams(taxParams);
        projectTaxRecipient = taxParams.projectTaxRecipient;
    }

    function _processTaxParams(
        ERC20TaxParameters memory erc20TaxParameters_
    ) internal returns (bool tokenHasTax_) {
        if (
            erc20TaxParameters_.projectBuyTaxBasisPoints == 0 &&
            erc20TaxParameters_.projectSellTaxBasisPoints == 0
        ) {
            return false;
        } else {
            projectBuyTaxBasisPoints = uint16(
                erc20TaxParameters_.projectBuyTaxBasisPoints
            );
            projectSellTaxBasisPoints = uint16(
                erc20TaxParameters_.projectSellTaxBasisPoints
            );
            return true;
        }
    }

    function addLiquidityPool(
        address newLiquidityPool_
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        // Don't allow calls that didn't pass an address:
        if (newLiquidityPool_ == address(0)) {
            _revert(LiquidityPoolCannotBeAddressZero.selector);
        }
        // Only allow smart contract addresses to be added, as only these can be pools:
        if (newLiquidityPool_.code.length == 0) {
            _revert(LiquidityPoolMustBeAContractAddress.selector);
        }
        // Add this to the enumerated list:
        _liquidityPools.add(newLiquidityPool_);
        emit LiquidityPoolAdded(newLiquidityPool_);
    }

    function removeLiquidityPool(
        address removedLiquidityPool_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        // Remove this from the enumerated list:
        _liquidityPools.remove(removedLiquidityPool_);
        emit LiquidityPoolRemoved(removedLiquidityPool_);
    }

    function transfer(
        address to,
        uint256 value
    ) public override returns (bool) {
        address owner = _msgSender();
        _transfer(
            owner,
            to,
            value,
            (isLiquidityPool(owner) || isLiquidityPool(to))
        );
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);
        _transfer(
            from,
            to,
            amount,
            (isLiquidityPool(from) || isLiquidityPool(to))
        );
        return true;
    }

    function _transfer(
        address from,
        address to,
        uint256 amount,
        bool applyTax
    ) internal virtual {
        // Perform pre-tax validation (e.g. amount doesn't exceed balance, max txn amount)
        uint256 fromBalance = _pretaxValidationAndLimits(from, to, amount);

        // Process taxes
        uint256 amountMinusTax = _taxProcessing(applyTax, to, from, amount);

        _setBalance(from, fromBalance - amount);
        _increaseBalance(to, amountMinusTax);

        emit Transfer(from, to, amountMinusTax);
    }

    function _pretaxValidationAndLimits(
        address from_,
        address to_,
        uint256 amount_
    ) internal view returns (uint256 fromBalance_) {
        if (from_ == address(0)) {
            _revert(TransferFromZeroAddress.selector);
        }

        if (to_ == address(0)) {
            _revert(TransferToZeroAddress.selector);
        }

        fromBalance_ = balanceOf(from_);

        if (fromBalance_ < amount_) {
            _revert(TransferAmountExceedsBalance.selector);
        }

        return (fromBalance_);
    }

    function _taxProcessing(
        bool applyTax_,
        address to_,
        address from_,
        uint256 sentAmount_
    ) internal returns (uint256 amountLessTax_) {
        amountLessTax_ = sentAmount_;
        unchecked {
            if (_tokenHasTax && applyTax_) {
                uint256 tax;

                // on sell
                if (isLiquidityPool(to_) && totalSellTaxBasisPoints() > 0) {
                    uint256 projectTax = ((sentAmount_ *
                        projectSellTaxBasisPoints) / BP_DENOM);
                    projectTaxPendingSwap += uint128(projectTax);
                    tax += projectTax;
                }
                // on buy
                else if (
                    isLiquidityPool(from_) && totalBuyTaxBasisPoints() > 0
                ) {
                    uint256 projectTax = ((sentAmount_ *
                        projectBuyTaxBasisPoints) / BP_DENOM);
                    projectTaxPendingSwap += uint128(projectTax);
                    tax += projectTax;
                }

                if (tax > 0) {
                    _increaseBalance(address(this), tax);
                    emit Transfer(from_, address(this), tax);
                    amountLessTax_ -= tax;
                }
            }
        }
        return (amountLessTax_);
    }

    fallback() external {
        revert("Not supported");
    }

    function withdrawERC20(
        address token_,
        uint256 amount_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (token_ == address(this)) {
            _revert(CannotWithdrawThisToken.selector);
        }
        IERC20(token_).safeTransfer(_msgSender(), amount_);
    }

    function isLiquidityPool(address queryAddress_) public view returns (bool) {
        return _liquidityPools.contains(queryAddress_);
    }

    function totalBuyTaxBasisPoints() public view returns (uint256) {
        return projectBuyTaxBasisPoints;
    }

    function totalSellTaxBasisPoints() public view returns (uint256) {
        return projectSellTaxBasisPoints;
    }

    function distributeTaxTokens() external {
        if (projectTaxPendingSwap > 0) {
            uint256 projectDistribution = projectTaxPendingSwap;
            projectTaxPendingSwap = 0;
            _transfer(
                address(this),
                projectTaxRecipient,
                projectDistribution,
                false
            );
        }
    }

    function setProjectTaxRecipient(
        address projectTaxRecipient_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        projectTaxRecipient = projectTaxRecipient_;
        emit ProjectTaxRecipientUpdated(projectTaxRecipient_);
    }

    function setProjectTaxRates(
        uint16 newProjectBuyTaxBasisPoints_,
        uint16 newProjectSellTaxBasisPoints_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            newProjectBuyTaxBasisPoints_ < BP_DENOM,
            "Buy tax basis points must be less than 10000"
        );
        require(
            newProjectSellTaxBasisPoints_ < BP_DENOM,
            "Sell tax basis points must be less than 10000"
        );

        uint16 oldBuyTaxBasisPoints = projectBuyTaxBasisPoints;
        uint16 oldSellTaxBasisPoints = projectSellTaxBasisPoints;

        _tokenHasTax =
            newProjectBuyTaxBasisPoints_ > 0 ||
            newProjectSellTaxBasisPoints_ > 0;

        projectBuyTaxBasisPoints = newProjectBuyTaxBasisPoints_;
        projectSellTaxBasisPoints = newProjectSellTaxBasisPoints_;

        emit ProjectTaxBasisPointsChanged(
            oldBuyTaxBasisPoints,
            newProjectBuyTaxBasisPoints_,
            oldSellTaxBasisPoints,
            newProjectSellTaxBasisPoints_
        );
    }

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
}
