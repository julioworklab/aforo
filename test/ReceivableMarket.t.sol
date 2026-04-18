// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { ReceivableMarket } from "../src/ReceivableMarket.sol";
import { MockUSDC } from "../src/MockUSDC.sol";
import { IERC20 } from "../src/interfaces/IERC20.sol";

contract ReceivableMarketTest is Test {
    ReceivableMarket market;
    MockUSDC usdc;

    address dealer = makeAddr("dealer");
    address lender1 = makeAddr("lender1");
    address lender2 = makeAddr("lender2");
    address treasury = makeAddr("treasury");

    // amounts in USDC 6-decimals
    uint256 constant FACE = 1_080_000 * 1e6;        // 1.08M mUSDC (Alan Valadez deal)
    uint256 constant DISCOUNT_BPS = 300;            // 3% discount to lenders
    uint256 constant PROTOCOL_FEE_BPS = 50;         // 0.5% protocol fee

    function setUp() public {
        usdc = new MockUSDC();
        market = new ReceivableMarket(IERC20(address(usdc)), treasury);

        // Fund lenders + dealer (for settlement later). Lender1 gets enough
        // to solo-fund the full receivable in tests that need it.
        usdc.mint(lender1, 2_000_000 * 1e6);
        usdc.mint(lender2, 2_000_000 * 1e6);
        usdc.mint(dealer, 2_000_000 * 1e6);
    }

    function testFullHappyPath() public {
        // 1. Dealer lists receivable
        vm.prank(dealer);
        uint256 id = market.listReceivable(
            FACE,
            DISCOUNT_BPS,
            PROTOCOL_FEE_BPS,
            block.timestamp + 30 days,
            keccak256("MONDAY_PULSE_ALAN_VALADEZ_2026_03_24")
        );
        assertEq(id, 1);

        ReceivableMarket.Receivable memory r = market.getReceivable(id);
        uint256 expectedGoal = (FACE * (10_000 - DISCOUNT_BPS)) / 10_000;
        assertEq(r.fundingGoal, expectedGoal);
        assertEq(uint256(r.status), uint256(ReceivableMarket.Status.Listed));

        // 2. Two lenders fund the receivable
        uint256 l1 = expectedGoal * 60 / 100;  // 60%
        uint256 l2 = expectedGoal - l1;         // 40%

        vm.startPrank(lender1);
        usdc.approve(address(market), l1);
        market.fundReceivable(id, l1);
        vm.stopPrank();

        vm.startPrank(lender2);
        usdc.approve(address(market), l2);
        market.fundReceivable(id, l2);
        vm.stopPrank();

        r = market.getReceivable(id);
        assertEq(uint256(r.status), uint256(ReceivableMarket.Status.Funded));
        assertEq(r.fundedAmount, expectedGoal);

        // 3. Dealer disburses (gets cash minus protocol fee)
        uint256 dealerBalBefore = usdc.balanceOf(dealer);
        vm.prank(dealer);
        market.disburseToDealer(id);

        uint256 protocolFee = (expectedGoal * PROTOCOL_FEE_BPS) / 10_000;
        uint256 expectedDealerReceive = expectedGoal - protocolFee;
        assertEq(usdc.balanceOf(dealer) - dealerBalBefore, expectedDealerReceive);
        assertEq(usdc.balanceOf(treasury), protocolFee);

        // 4. Dealer settles (deposits face value)
        vm.startPrank(dealer);
        usdc.approve(address(market), FACE);
        market.settleReceivable(id);
        vm.stopPrank();

        r = market.getReceivable(id);
        assertEq(uint256(r.status), uint256(ReceivableMarket.Status.Settled));

        // 5. Lenders claim pro-rata
        uint256 lender1BalBefore = usdc.balanceOf(lender1);
        uint256 lender2BalBefore = usdc.balanceOf(lender2);

        vm.prank(lender1);
        market.claim(id);

        vm.prank(lender2);
        market.claim(id);

        uint256 lender1Payout = usdc.balanceOf(lender1) - lender1BalBefore;
        uint256 lender2Payout = usdc.balanceOf(lender2) - lender2BalBefore;

        // Each lender's payout = their share * faceValue / fundingGoal
        uint256 expectedL1Payout = (l1 * FACE) / expectedGoal;
        uint256 expectedL2Payout = (l2 * FACE) / expectedGoal;
        assertEq(lender1Payout, expectedL1Payout);
        assertEq(lender2Payout, expectedL2Payout);

        // Yield check: each lender earned ~3% on their deployed capital
        assertGt(lender1Payout, l1);
        assertGt(lender2Payout, l2);
    }

    function testCancelRefundsLenders() public {
        vm.prank(dealer);
        uint256 id = market.listReceivable(
            FACE, DISCOUNT_BPS, PROTOCOL_FEE_BPS, block.timestamp + 30 days, bytes32("TEST")
        );

        uint256 goal = market.getReceivable(id).fundingGoal;
        uint256 partialFund = goal / 3;

        vm.startPrank(lender1);
        usdc.approve(address(market), partialFund);
        market.fundReceivable(id, partialFund);
        vm.stopPrank();

        vm.prank(dealer);
        market.cancelReceivable(id);

        uint256 lender1BalBefore = usdc.balanceOf(lender1);
        vm.prank(lender1);
        market.claim(id);

        assertEq(usdc.balanceOf(lender1) - lender1BalBefore, partialFund);
    }

    function testDefaultAfterDeadline() public {
        vm.prank(dealer);
        uint256 id = market.listReceivable(
            FACE, DISCOUNT_BPS, PROTOCOL_FEE_BPS, block.timestamp + 7 days, bytes32("TEST")
        );

        uint256 goal = market.getReceivable(id).fundingGoal;
        vm.startPrank(lender1);
        usdc.approve(address(market), goal);
        market.fundReceivable(id, goal);
        vm.stopPrank();

        vm.prank(dealer);
        market.disburseToDealer(id);

        // Move past deadline without settlement
        vm.warp(block.timestamp + 8 days);

        market.markDefault(id);

        assertEq(uint256(market.getReceivable(id).status), uint256(ReceivableMarket.Status.Defaulted));
    }

    function testCannotFundOverGoal() public {
        vm.prank(dealer);
        uint256 id = market.listReceivable(
            FACE, DISCOUNT_BPS, PROTOCOL_FEE_BPS, block.timestamp + 30 days, bytes32("TEST")
        );
        uint256 goal = market.getReceivable(id).fundingGoal;

        vm.startPrank(lender1);
        usdc.approve(address(market), goal + 1);
        vm.expectRevert(ReceivableMarket.OverFunding.selector);
        market.fundReceivable(id, goal + 1);
        vm.stopPrank();
    }

    function testOnlyDealerCanDisburse() public {
        vm.prank(dealer);
        uint256 id = market.listReceivable(
            FACE, DISCOUNT_BPS, PROTOCOL_FEE_BPS, block.timestamp + 30 days, bytes32("TEST")
        );
        uint256 goal = market.getReceivable(id).fundingGoal;

        vm.startPrank(lender1);
        usdc.approve(address(market), goal);
        market.fundReceivable(id, goal);
        vm.stopPrank();

        vm.prank(lender1);
        vm.expectRevert(ReceivableMarket.NotDealer.selector);
        market.disburseToDealer(id);
    }
}
