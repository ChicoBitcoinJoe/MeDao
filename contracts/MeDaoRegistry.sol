pragma solidity ^0.5.0;

import "./external/ERC20.sol";
import "./Interfaces.sol";
import "./MeDaoFactory.sol";

contract MeDaoRegistry {

    MeDaoFactory public factory;

    WETH public weth;
    ERC20 public dai;

    mapping (address => MeDao) public registry;

    constructor (
        MeDaoFactory _factory,
        ERC20 _dai,
        WETH _weth
    ) public {
        factory = _factory;
        dai = _dai;
        weth = _weth;
    }

    function create (
        string memory name,
        int birthTimestamp,
        uint tokenClaim,
        uint reserveAmount
    ) public returns (MeDao medao) {
        require(dai.transferFrom(msg.sender, address(this), reserveAmount));
        require(dai.approve(address(factory), reserveAmount));

        medao = MeDao(factory.create(
            msg.sender,
            dai,
            name,
            birthTimestamp,
            tokenClaim,
            reserveAmount
        ));

        register(medao);
    }

    function create (
        string memory name,
        int birthTimestamp,
        uint tokenClaim,
        uint reserveAmount,
        DEX exchange
    ) public payable returns (MeDao medao) {
        uint maxPayAmount = msg.value;
        weth.deposit.value(maxPayAmount)();
        require(weth.approve(address(exchange), maxPayAmount));
        uint payedAmount = exchange.buyAllAmount(dai, reserveAmount, weth, maxPayAmount);
        weth.withdraw(maxPayAmount - payedAmount);
        msg.sender.transfer(address(this).balance);
        require(dai.approve(address(factory), reserveAmount));

        medao = MeDao(factory.create(
            msg.sender,
            dai,
            name,
            birthTimestamp,
            tokenClaim,
            reserveAmount
        ));

        register(medao);
    }

    function create (
        string memory name,
        int birthTimestamp,
        uint tokenClaim,
        DEX exchange,
        ERC20 payToken,
        uint maxPayAmount,
        uint reserveAmount
    ) public returns (MeDao medao) {
        require(payToken.transferFrom(msg.sender, address(this), maxPayAmount));
        require(payToken.approve(address(exchange), maxPayAmount));
        uint payedAmount = exchange.buyAllAmount(dai, reserveAmount, payToken, maxPayAmount);
        require(dai.approve(address(factory), reserveAmount));

        medao = MeDao(factory.create(
            msg.sender,
            dai,
            name,
            birthTimestamp,
            tokenClaim,
            reserveAmount
        ));

        register(medao);
    }

    function register (MeDao medao) public {
        require(factory.created(address(medao)));

        registry[msg.sender] = medao;
        emit Register_event(msg.sender, medao);
    }

    event Register_event (address owner, MeDao medao);

}
