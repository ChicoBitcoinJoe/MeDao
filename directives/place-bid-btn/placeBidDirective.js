MeDao.directive('placeBidBtn', ['$q','$mdDialog','Web3Service','MeDaoService','Notifier',
function($q,$mdDialog,Web3Service,MeDaoService,Notifier) {
	return {
		restrict: 'E',
		scope: {
            owner: '='
		},
		replace: true,
		templateUrl: 'directives/place-bid-btn/placeBidDirective.html',
		controller: function($scope){
            
            function DialogController($scope, $mdDialog, data) {
                $scope.owner = data.owner;
                
                $scope.totalBids = 0;
                $scope.totalEtherBid = 0;
                $scope.teir = [];
                
                $scope.bid = {
                    amountInEther: 0
                };
                
                $scope.back = function() {
                    $mdDialog.hide(0);
                };

                $scope.place = function() {
                    var touchingTeir = getTouchingTeir(web3.toWei($scope.bid.amountInEther,'ether'));
                    $mdDialog.hide({
                        ether:$scope.bid.amountInEther,
                        touchingTeir:touchingTeir
                    });
                };
                
                $scope.max = function() {
                    Web3Service.getCurrentAccount()
                    .then(function(account){
                        return Web3Service.getEtherBalance(account);
                    }).then(function(etherBalanceInWei){
                        $scope.bid.amountInEther = web3.fromWei(etherBalanceInWei,'ether');
                    });
                };
                
                setInterval(function(){
                    $scope.getTeirData();
                },15000);

                $scope.getTeirData = function(){
                    MeDaoService.getMeDaoAddress($scope.owner)
                    .then(function(medaoAddress){
                        return MeDaoService.getAuctionAddress(medaoAddress);
                    }).then(function(auctionAddress){
                        $scope.auctionAddress = auctionAddress;
                        return MeDaoService.getTeirs(auctionAddress);
                    }).then(function(teirs){
                        console.log(teirs);
                        $scope.teirs = teirs;
                        
                        var promises = [];
                        for(var i = 0; i < teirs.length; i++)
                            promises[i] = MeDaoService.getTeirInfo($scope.auctionAddress,teirs[i]);
                        
                        return $q.all(promises);
                    }).then(function(promises){
                        var bids = 0;
                        var ether = 0;
                        
                        for(var i = 0; i < promises.length; i++){
                            var teirInfo = promises[i];
                            console.log(teirInfo);
                            var value = teirInfo[1];
                            var length = teirInfo[5].toNumber();
                            var total = web3.fromWei(value,'ether') * length;
                            console.log(total);
                            
                            bids += length;
                            ether += (web3.fromWei(value,'ether').toNumber() * length);
                            
                            $scope.teir[i] = {
                                value: value,
                                bids: length,
                                total: total
                            }
                        }
                        
                        $scope.totalBids = bids;
                        $scope.totalEtherBid = ether;
                        
                    }).catch(function(err){
                        console.error(err);
                    });
                };
                
                $scope.setBidAmount = function(valueInWei){
                    console.log(valueInWei);
                    $scope.bid.amountInEther = web3.fromWei(valueInWei,'ether').toNumber();
                    console.log($scope.bid.amountInEther);
                };
                
                var getTouchingTeir = function(amountInWei) {
                    var total = $scope.teirs.length;
                    var currentTeir = 0;

                    for(var i = 0; i < total; i++){
                        currentTeir = $scope.teirs[i].toNumber();
                        if(amountInWei >= currentTeir){
                            console.log('touching teir: ' + currentTeir);
                            return currentTeir;
                        }
                    }

                    return currentTeir;
                };
                
                $scope.getTeirData();
            }
            
            $scope.openBidDialog = function(ev) {
                $mdDialog.show({
                    controller: DialogController,
                    templateUrl: 'directives/place-bid-btn/placeBidDialog.template.html',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose:true,
                    fullscreen: false, // Only for -xs, -sm breakpoints.
                    locals: {
                        data:{
                            owner:$scope.owner
                        }
                    }
                }).then(function(bidData) {
                    console.log(bidData.ether);
                    if(bidData.ether > 0)
                        $scope.placeBid(bidData.ether,bidData.touchingTeir);
                }).catch(function() {
                    console.log('You cancelled the dialog.');
                });
            };
            
            $scope.placeBid = function(amountInEther,touchingTeir){
                var bidInWei = web3.toWei(amountInEther,'ether');
                console.log(bidInWei,touchingTeir);
                
                MeDaoService.getMeDaoAddress($scope.owner)
                .then(function(medaoAddress){
                    return $q.all([
                        Web3Service.getCurrentAccount(),
                        MeDaoService.getAuctionAddress(medaoAddress)
                    ]);
                }).then(function(promises){
                    var account = promises[0];
                    var medaoAddress = promises[1];
                    
                    return MeDaoService.placeBid(
                        medaoAddress,
                        account,
                        bidInWei,
                        touchingTeir
                    );
                }).then(function(txHash){
                    $scope.txHash = txHash;
                    return Web3Service.getTransactionReceipt(txHash);
                }).then(function(receipt){
                    console.log(receipt);
                    clearInterval($scope.interval);
                    return Web3Service.getTransaction($scope.txHash);
                }).then(function(receipt){
                    Notifier.notify('Bid of ' + web3.fromWei(receipt.value,'ether') + ' ether included in block ' + receipt.blockNumber);
                }).catch(function(err){
                    console.error(err);
                });
            };
		},
		link : function($scope, $element, $attrs) {
            
		}
	}
}]);