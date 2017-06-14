pragma solidity ^0.4.11;

import "MiniMeToken.sol";

contract ERC20Token {
    function transfer(address _to, uint256 _value) returns (bool success);
    function balanceOf(address _owner) constant returns (uint256 balance);
}

contract Owned {
    address public owner;

    function Owned() {
        owner = msg.sender;
    }
    
    function transferOwnership (address _newOwner) onlyOwner {
        owner = _newOwner;
    }
    
    modifier onlyOwner() {
        if(msg.sender != owner) throw;
        _;
    }
}

/*
    Copyright 2017, Joseph Reed

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/// @title MeDao Contract
/// @author Joseph Reed
/// @dev A MeDao aims to let anyone issue time shares for themselves. The issuer
///      should talk to shareholders for advice on how to maximize value for 
///      themselves and for shareholders. Up to 40 hours worth of time are 
///      auctioned off each week. The Owner of the MeDao is expected to burn  
///      a certain amount of tokens each week negotiated between the Owner
///      and the Shareholders and thus will be diffrent for every MeDao. For 
///      more info go to <github link here>.

contract Tokenized is Owned {
    
    MiniMeToken public Token;
    address public withdraw_address;
    
    function setupToken (
        address withdrawAddress,
        MiniMeToken CloneableToken,
        string _tokenName,
        uint8 _decimals,
        string _symbol,
        uint _snapshotBlock,
        bool _transfersEnabled
    ) onlyOwner {
        withdraw_address = withdrawAddress;
        address token = CloneableToken.createCloneToken(
            _tokenName,
            _decimals,
            _symbol,
            _snapshotBlock,
            _transfersEnabled
        );
        
        Token = MiniMeToken(token);
    }
    
    function withdrawEther () onlyOwner {
        var balance = this.balance;
        withdraw_address.transfer(balance);
        
        WithdrawEther_event(withdraw_address,balance);
    }
    
    function withdrawERC20Token (address Token) onlyOwner {
        uint tokenBalance = ERC20Token(Token).balanceOf(this);
        ERC20Token(Token).transfer(withdraw_address,tokenBalance);
        
        WithdrawToken_event(withdraw_address,Token,tokenBalance);
    }
    
    function updateDepositAddress (address _newDepositAddress) onlyOwner {
        withdraw_address = _newDepositAddress;
        
        NewWithdrawAddress_event(withdraw_address);
    }
    
    function () payable {
        withdraw_address.transfer(msg.value);
        
        Payable_event(msg.sender,msg.value);
    }
    
    modifier onlyTokenHolders (uint _minimum_needed) {
        uint tokens = Token.balanceOf(msg.sender);
        if(tokens < _minimum_needed) throw;
        _;
    }
    
    event Payable_event(address sender, uint amount);
    event WithdrawEther_event(address withdrawAddress, uint amount); 
    event WithdrawToken_event(address withdrawAddress, address token, uint amount); 
    event NewWithdrawAddress_event(address withdraw_address);
}

contract OngoingAuction is Owned {
    
    uint public current_bids_open;
    uint public total_bids_made;
    mapping (uint => Bid) public bids;
    mapping (address => Bidder) public bidders;
    
    uint public top_teir;
    uint public bottom_teir;
    uint public total_teirs;
    mapping (uint => Teir) public teirs; //DLL
    
////////////////
// Auction Functions
////////////////
    
    function placeBid (uint touchingTeir) payable {
        if(msg.value == 0) throw;
        
        if(teirs[msg.value].line_length == 0) {
            if(teirs[touchingTeir].line_length == 0 && top_teir != 0) throw;
            
            addNewTeir_internal(touchingTeir);
        }
        
        addNewBid_internal();
    }
    
    function removeBid (uint bid_id) {
        if (msg.sender != bids[bid_id].owner) throw;
        
        removeBid_internal(bid_id);
        bids[bid_id].cancelled = true;
        
        if (!bids[bid_id].owner.send(bids[bid_id].value)) throw;
    }
    
    function acceptHighestBid (address deposit_address) onlyOwner returns (uint) {
        if(top_teir == 0) throw;
        
        uint winning_bid_id = teirs[top_teir].front_of_line_id;
        removeBid_internal(winning_bid_id);
        bids[winning_bid_id].accepted = true;
        
        uint bidValue = bids[winning_bid_id].value;
        deposit_address.transfer(bidValue);
        
        return winning_bid_id;
    }
    
    function getBids (address bidder) constant returns (uint[]) {
        uint total_bids = bidders[bidder].total_bids_made;
        uint[] memory all_bids = new uint[](total_bids);
        
        for(uint i = 0; i < total_bids; i++)
            all_bids[i] = bidders[bidder].bids[i+1];
        
        return all_bids;
    }
    
    function getTeirs () constant returns (uint[]) {
        uint[] memory all_teirs = new uint[](total_teirs);
        uint current_teir = teirs[top_teir].value; 
        for (uint i = 0; i < total_teirs; i++) {
            all_teirs[i] = current_teir;
            current_teir = teirs[current_teir].teir_below;
        }
        
        return all_teirs;
    }
    
    function getBidOwner (uint bid_id) constant returns (address) {
        return bids[bid_id].owner;
    }
    
    function getBidValue (uint bid_id) constant returns (uint) {
        return bids[bid_id].value;
    }
    
////////////////
// Internal Functions
////////////////
    
    function addNewTeir_internal (uint touching) internal {
        uint value = msg.value;
        
        if (top_teir == 0) {
            teirs[value] = Teir(0,value,0,0,0,0);
            top_teir = value;
            bottom_teir = value;
        } else if (value > top_teir && touching == top_teir) {
            teirs[value] = Teir(0,value,top_teir,0,0,0);
            teirs[top_teir].teir_above = value;
            top_teir = value;
        } else if (value < bottom_teir && touching == bottom_teir) {
            teirs[value] = Teir(bottom_teir,value,0,0,0,0);
            teirs[bottom_teir].teir_below = value;
            bottom_teir = value;
        } else {
            uint above;
            uint below;
            if(value > touching) {
                above = teirs[touching].teir_above;
                below = touching;
                if(value > above) throw;
            } else if(value < touching) {
                above = touching;
                below = teirs[touching].teir_below;
                if(value < below) throw;
            }
            
            teirs[value] = Teir(above,value,below,0,0,0);
            teirs[above].teir_below = value;
            teirs[below].teir_above = value;
        }
        
        total_teirs++;
    }
    
    function removeTeir_internal (uint value) internal {
        uint teir_below = teirs[value].teir_below;
        uint teir_above = teirs[value].teir_above;
        
        if (value == top_teir && value == bottom_teir) {
            top_teir = 0;
            bottom_teir = 0;
        } else if (value == top_teir) {
            teirs[teir_below].teir_above = 0;
            top_teir = teir_below;
        } else if (value == bottom_teir) {
            teirs[teir_above].teir_below = 0;
            bottom_teir = teir_above;
        } else {
            teirs[teir_above].teir_below = teir_below;
            teirs[teir_below].teir_above = teir_above;
        }
        
        delete teirs[value];
        total_teirs--;
    }
    
    function addNewBid_internal () internal {
        current_bids_open++;
        total_bids_made++;
        uint new_bid_id = total_bids_made;
        
        teirs[msg.value].line[new_bid_id] = SpotInLine(back_of_line_id,new_bid_id,0);
        
        if (teirs[msg.value].line_length == 0)
            teirs[msg.value].front_of_line_id = new_bid_id;
            
        uint back_of_line_id = teirs[msg.value].back_of_line_id;
        if (back_of_line_id != 0)
            teirs[msg.value].line[back_of_line_id].prev = new_bid_id;
        
        teirs[msg.value].back_of_line_id = new_bid_id;
        teirs[msg.value].line_length++;
        
        bids[new_bid_id] = Bid(new_bid_id,msg.sender,msg.value,false,false);
        bidders[msg.sender].current_bids_open++;
        bidders[msg.sender].total_bids_made++;
        uint total_bids = bidders[msg.sender].total_bids_made;
        bidders[msg.sender].bids[total_bids] = new_bid_id;
        
        NewBid_event(msg.sender,new_bid_id,msg.value);
    }
    
    function removeBid_internal (uint bid_id) internal {
        Bid bid = bids[bid_id];
        if(teirs[bid.value].line_length == 0) throw;
        if(bid.accepted || bid.cancelled) throw;
        
        uint front_of_line_id = teirs[bid.value].front_of_line_id;
        uint back_of_line_id = teirs[bid.value].back_of_line_id;
        if (bid.id == front_of_line_id) {
            uint prev = teirs[bid.value].line[bid.id].prev;
            teirs[bid.value].front_of_line_id = prev;
            teirs[bid.value].line[prev].prev = 0;
        } else if (bid.id == back_of_line_id) {
            uint next = teirs[bid.value].line[bid.id].next;
            teirs[bid.value].back_of_line_id = next;
            teirs[bid.value].line[next].prev = 0;
        } else {
            uint front_id = teirs[bid.value].line[bid.id].next;
            uint back_id = teirs[bid.value].line[bid.id].prev;
            teirs[bid.value].line[front_id].prev = back_id;
            teirs[bid.value].line[back_id].next = front_id;
        }
        
        delete teirs[bid.value].line[bid_id];
        teirs[bid.value].line_length--;
        
        bidders[msg.sender].current_bids_open--;
        current_bids_open--;
        
        if(teirs[bid.value].line_length == 0)
            removeTeir_internal(bid.value);
    }
    
////////////////
// Structs and Events
////////////////
    
    struct SpotInLine {
        uint next;
        uint bid_id;
        uint prev;
    }
    
    struct Bidder {
        uint current_bids_open;
        uint total_bids_made;
        mapping (uint => uint) bids;
    }
    
    struct Bid {
        uint id;
        address owner;
        uint value;
        bool cancelled;
        bool accepted;
    }
    
    struct Teir {
        uint teir_above;
        uint value;
        uint teir_below;
        
        uint front_of_line_id;
        uint back_of_line_id;
        uint line_length;
        mapping (uint => SpotInLine) line; //FIFO DLL
    }
    
    event NewBid_event(address bidder, uint bid_id, uint value);
}

contract MeDao is Tokenized {
    
    string public version = '0.0.2';
    
    address public Founder;
    
    OngoingAuction public Auction;
    
    uint public weekly_auction_reward;
    uint public scheduled_auction_timestamp;
    uint public auction_period;
    
    uint public total_proof_of_work;
   
    uint public cooldown_timestamp;
    uint burn_minimum = 1;
     
////////////////
// MeDao Functions
////////////////

    function MeDao (address founder, OngoingAuction auction) {
        Founder = founder;
        Auction = auction;
    }
    
    function startAuction () isScheduled {
        uint winning_bid_id = Auction.acceptHighestBid(withdraw_address);
        address winner = Auction.getBidOwner(winning_bid_id);
        uint winning_bid_value = Auction.getBidValue(winning_bid_id);
        
        Token.generateTokens(winner, 1 hours);
        
        AuctionWinner_event(winner,winning_bid_value);
    }
    
    function submitProofOfWork (uint burnAmount, string metadataHash) 
    onlyTokenHolders(burn_minimum) {
        if(Token.balanceOf(msg.sender) < burnAmount) throw;
        
        Token.destroyTokens(msg.sender,burnAmount);
        total_proof_of_work += burnAmount;
        
        ProofOfWork_event(msg.sender,burnAmount,metadataHash);
    }
    
////////////////
// Owner Only
////////////////
    
    function setWeeklyAuctionReward (uint8 reward) onlyOwner 
    hasCooldown(7 days) {
        if(reward > 40 hours || reward == 0) throw;
        
        weekly_auction_reward = reward;
        auction_period = 5 minutes; //set to 5 minutes for testing. Normally use
                                    //7 days / auction_reward;
        scheduled_auction_timestamp = now + auction_period;
        
        NewWeeklyAuctionReward_event(weekly_auction_reward);
    }
    
    function setBurnMinimum (uint burnMinimum) onlyOwner {
        burn_minimum = burnMinimum;
    }
    
////////////////
// Events and Modifiers
////////////////

    modifier isScheduled () {
        if (scheduled_auction_timestamp == 0) throw;
        if (now < scheduled_auction_timestamp) throw;
        
        if(now < scheduled_auction_timestamp + auction_period)
            scheduled_auction_timestamp += auction_period;
        else
            scheduled_auction_timestamp = now + auction_period;
        
        _;
    }
    
    modifier hasCooldown (uint cooldown) {
        if(now < cooldown_timestamp) throw;
        
        cooldown_timestamp = now + cooldown;
        _;
    }
    
    event AuctionWinner_event (address winner, uint ether_bid);
    event ProofOfWork_event(address sender, uint amount, string metadataHash);
    event NewDepositAddress_event(address deposit_address);
    event NewWeeklyAuctionReward_event(uint new_auction_reward);
}

contract MeDaoRegistry {
    
    MiniMeToken PrimeToken;
    
    uint public total_medaos;
    mapping (uint => address) public founders;
    mapping (address => MeDao ) public medaos;
    
    function MeDaoRegistry (MiniMeToken Token) {
        PrimeToken = Token;
    }
    
    function register (string name) {
        if(medaos[msg.sender] != address(0x0)) throw;
        
        uint next_id = total_medaos++;
        founders[next_id] = msg.sender;
        
        OngoingAuction Auction = new OngoingAuction();
        
        medaos[msg.sender] = new MeDao(msg.sender,Auction);
        medaos[msg.sender].setupToken(msg.sender,PrimeToken,name,0,'seconds',0,true);
        medaos[msg.sender].transferOwnership(msg.sender);
        Auction.transferOwnership(medaos[msg.sender]);
        
        NewMeDao_event(msg.sender, medaos[msg.sender]);
    }
    
    event NewMeDao_event(address founder, address medao);
}