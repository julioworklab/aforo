// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IERC20 } from "./interfaces/IERC20.sol";

/// @title ReceivableMarket
/// @notice B2B receivable factoring market. A business with a confirmed receivable
///         (e.g. an auto dealer who sold with bank financing) lists it; lenders
///         fund it at a discount; the business gets cash today; lenders get paid
///         when the off-chain counterparty (bank/financiera) settles.
contract ReceivableMarket {
    // --- Types -------------------------------------------------------------

    enum Status {
        None,
        Listed,       // created by dealer, accepting funding
        Funded,       // fully funded, disbursement pending
        Disbursed,    // dealer received cash, waiting for off-chain settlement
        Settled,      // dealer deposited face value, lenders can claim
        Defaulted,    // past deadline without settlement
        Cancelled     // dealer cancelled before funding complete
    }

    struct Receivable {
        address dealer;              // who gets the disbursement
        uint256 faceValue;           // total amount expected from off-chain settler
        uint256 discountBps;         // discount the dealer pays (100 = 1%)
        uint256 protocolFeeBps;      // protocol fee (50 = 0.5%)
        uint256 fundingGoal;         // = faceValue * (10000 - discountBps) / 10000
        uint256 fundedAmount;        // running total funded by lenders
        uint256 settlementDeadline;  // unix ts after which default can be declared
        bytes32 offchainRef;         // hash of off-chain deal ID (Monday pulse, invoice #, etc.)
        Status status;
        uint256 settledAmount;       // amount deposited back by dealer (usually = faceValue)
    }

    // --- Storage -----------------------------------------------------------

    IERC20 public immutable usdc;
    address public immutable protocolTreasury;
    uint256 public nextReceivableId;

    mapping(uint256 => Receivable) public receivables;
    // receivableId => lender => funded amount (pro-rata share tracker)
    mapping(uint256 => mapping(address => uint256)) public lenderShare;
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    // --- Events ------------------------------------------------------------

    event ReceivableListed(
        uint256 indexed id,
        address indexed dealer,
        uint256 faceValue,
        uint256 discountBps,
        uint256 fundingGoal,
        uint256 settlementDeadline,
        bytes32 offchainRef
    );
    event LenderFunded(uint256 indexed id, address indexed lender, uint256 amount);
    event DealerDisbursed(uint256 indexed id, address indexed dealer, uint256 amount, uint256 protocolFee);
    event ReceivableSettled(uint256 indexed id, uint256 settledAmount);
    event LenderClaimed(uint256 indexed id, address indexed lender, uint256 amount);
    event ReceivableDefaulted(uint256 indexed id);
    event ReceivableCancelled(uint256 indexed id);

    // --- Errors ------------------------------------------------------------

    error ZeroAmount();
    error NotDealer();
    error WrongStatus();
    error OverFunding();
    error NotFundedYet();
    error DeadlineNotReached();
    error NothingToClaim();
    error InvalidParams();

    // --- Constructor -------------------------------------------------------

    constructor(IERC20 _usdc, address _treasury) {
        require(address(_usdc) != address(0) && _treasury != address(0), "zero addr");
        usdc = _usdc;
        protocolTreasury = _treasury;
    }

    // --- Dealer actions ----------------------------------------------------

    /// @notice Dealer lists a new receivable for funding.
    /// @param faceValue Total amount expected from off-chain settlement (in USDC units).
    /// @param discountBps Discount paid to lenders (100 bps = 1%). Max 1500 (15%).
    /// @param protocolFeeBps Protocol fee in bps (50 bps = 0.5%). Max 100 (1%).
    /// @param settlementDeadline Unix timestamp after which default can be declared.
    /// @param offchainRef 32-byte reference (e.g. keccak256 of Monday board pulse ID).
    function listReceivable(
        uint256 faceValue,
        uint256 discountBps,
        uint256 protocolFeeBps,
        uint256 settlementDeadline,
        bytes32 offchainRef
    ) external returns (uint256 id) {
        if (faceValue == 0) revert ZeroAmount();
        if (discountBps == 0 || discountBps > 1500) revert InvalidParams();
        if (protocolFeeBps > 100) revert InvalidParams();
        if (settlementDeadline <= block.timestamp) revert InvalidParams();

        id = ++nextReceivableId;
        uint256 fundingGoal = (faceValue * (10_000 - discountBps)) / 10_000;

        receivables[id] = Receivable({
            dealer: msg.sender,
            faceValue: faceValue,
            discountBps: discountBps,
            protocolFeeBps: protocolFeeBps,
            fundingGoal: fundingGoal,
            fundedAmount: 0,
            settlementDeadline: settlementDeadline,
            offchainRef: offchainRef,
            status: Status.Listed,
            settledAmount: 0
        });

        emit ReceivableListed(id, msg.sender, faceValue, discountBps, fundingGoal, settlementDeadline, offchainRef);
    }

    /// @notice Dealer cancels a receivable while still in Listed state.
    ///         Refunds any lenders who already funded.
    function cancelReceivable(uint256 id) external {
        Receivable storage r = receivables[id];
        if (r.dealer != msg.sender) revert NotDealer();
        if (r.status != Status.Listed) revert WrongStatus();

        r.status = Status.Cancelled;
        emit ReceivableCancelled(id);
        // Lenders reclaim via claim() which handles Cancelled state.
    }

    /// @notice Dealer calls this once receivable is fully funded to receive cash.
    ///         Transfers (fundingGoal - protocolFee) to dealer, protocolFee to treasury.
    function disburseToDealer(uint256 id) external {
        Receivable storage r = receivables[id];
        if (r.dealer != msg.sender) revert NotDealer();
        if (r.status != Status.Funded) revert WrongStatus();

        uint256 protocolFee = (r.fundingGoal * r.protocolFeeBps) / 10_000;
        uint256 toDealer = r.fundingGoal - protocolFee;

        r.status = Status.Disbursed;

        if (protocolFee > 0) {
            _safeTransfer(usdc, protocolTreasury, protocolFee);
        }
        _safeTransfer(usdc, r.dealer, toDealer);

        emit DealerDisbursed(id, r.dealer, toDealer, protocolFee);
    }

    /// @notice Dealer deposits the face value of the receivable once the off-chain
    ///         counterparty settles. Unlocks lender claims.
    function settleReceivable(uint256 id) external {
        Receivable storage r = receivables[id];
        if (r.dealer != msg.sender) revert NotDealer();
        if (r.status != Status.Disbursed) revert WrongStatus();

        r.status = Status.Settled;
        r.settledAmount = r.faceValue;

        _safeTransferFrom(usdc, msg.sender, address(this), r.faceValue);
        emit ReceivableSettled(id, r.faceValue);
    }

    // --- Lender actions ----------------------------------------------------

    /// @notice Lender funds a listed receivable. Transitions to Funded when goal is met.
    function fundReceivable(uint256 id, uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        Receivable storage r = receivables[id];
        if (r.status != Status.Listed) revert WrongStatus();

        uint256 remaining = r.fundingGoal - r.fundedAmount;
        if (amount > remaining) revert OverFunding();

        r.fundedAmount += amount;
        lenderShare[id][msg.sender] += amount;

        _safeTransferFrom(usdc, msg.sender, address(this), amount);
        emit LenderFunded(id, msg.sender, amount);

        if (r.fundedAmount == r.fundingGoal) {
            r.status = Status.Funded;
        }
    }

    /// @notice Lender claims their pro-rata share once the receivable is settled
    ///         (or cancelled, in which case principal is refunded).
    function claim(uint256 id) external {
        Receivable storage r = receivables[id];
        uint256 share = lenderShare[id][msg.sender];
        if (share == 0) revert NothingToClaim();
        if (hasClaimed[id][msg.sender]) revert NothingToClaim();

        uint256 payout;

        if (r.status == Status.Settled) {
            // Pro-rata share of settledAmount (= faceValue) proportional to
            // their funded share out of fundingGoal.
            payout = (share * r.settledAmount) / r.fundingGoal;
        } else if (r.status == Status.Cancelled) {
            // Pure refund of principal funded.
            payout = share;
        } else if (r.status == Status.Defaulted) {
            // Pro-rata of whatever was deposited before default.
            // settledAmount is 0 here; if any partial was deposited future logic
            // can be added. For now: zero payout, lender absorbs the loss.
            payout = 0;
        } else {
            revert WrongStatus();
        }

        hasClaimed[id][msg.sender] = true;
        if (payout > 0) {
            _safeTransfer(usdc, msg.sender, payout);
        }
        emit LenderClaimed(id, msg.sender, payout);
    }

    // --- Default handling --------------------------------------------------

    /// @notice Anyone can mark a Disbursed receivable as defaulted after the deadline.
    function markDefault(uint256 id) external {
        Receivable storage r = receivables[id];
        if (r.status != Status.Disbursed) revert WrongStatus();
        if (block.timestamp < r.settlementDeadline) revert DeadlineNotReached();

        r.status = Status.Defaulted;
        emit ReceivableDefaulted(id);
    }

    // --- Views -------------------------------------------------------------

    /// @notice Convenience getter used by UI for marketplace listing.
    function getReceivable(uint256 id) external view returns (Receivable memory) {
        return receivables[id];
    }

    /// @notice Projected yield for a lender funding `amount` of this receivable.
    ///         Returns (principalBack, interestEarned).
    function projectedReturn(uint256 id, uint256 amount) external view returns (uint256, uint256) {
        Receivable memory r = receivables[id];
        if (r.fundingGoal == 0) return (0, 0);
        uint256 shareAtSettlement = (amount * r.faceValue) / r.fundingGoal;
        uint256 interest = shareAtSettlement - amount;
        return (amount, interest);
    }

    // --- Internal ----------------------------------------------------------

    function _safeTransfer(IERC20 token, address to, uint256 amount) internal {
        (bool ok, bytes memory data) =
            address(token).call(abi.encodeWithSelector(IERC20.transfer.selector, to, amount));
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "transfer failed");
    }

    function _safeTransferFrom(IERC20 token, address from, address to, uint256 amount) internal {
        (bool ok, bytes memory data) = address(token).call(
            abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, amount)
        );
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "transferFrom failed");
    }
}
