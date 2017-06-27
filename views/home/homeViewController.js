app.controller('HomeViewController', ['$scope','$location','$q','Web3Service','MeDao',
function($scope,$location,$q,Web3Service,MeDao){
    //console.log('Loading Home View');
    
    $scope.loaded = false;
    $scope.hasMedao = false;
    $scope.dotted = true;
    $scope.customFullscreen = false;
    $scope.showInput = false;
    
    $scope.medao = {
        name: 'Enter Your Name',
        valid: false,
        salary: null
    };
    
    Web3Service.getCurrentAccount()
    .then(function(account){
        $scope.account = account;
        return MeDao.getMeDaoAddress(account);
    }).then(function(medaoAddress){
        console.log('medao address: ' + medaoAddress);
        $scope.medaoAddress = medaoAddress;
        if(medaoAddress == '0x0000000000000000000000000000000000000000'
        || medaoAddress == '0x'
        || medaoAddress == null)
            $scope.hasMedao = false;
        else {
            $scope.hasMedao = true;
            MeDao.getAuctionAddress($scope.medaoAddress)
            .then(function(auctionAddress){
                $scope.auctionAddress = auctionAddress;
                return MeDao.getTeirs($scope.auctionAddress);    
            }).then(function(teirs){
                //console.log(teirs);
                $scope.teirs = teirs;

                var promises = [];
                for(var i = 0; i < teirs.length; i++)
                    promises[i] = MeDao.getTeirInfo($scope.auctionAddress,teirs[i]);

                return $q.all(promises);
            }).then(function(promises){
                var bids = 0;
                var ether = 0;

                for(var i = 0; i < promises.length; i++){
                    var teirInfo = promises[i];
                    //console.log(teirInfo);
                    var value = teirInfo[1];
                    var length = teirInfo[5].toNumber();
                    var total = web3.fromWei(value,'ether') * length;
                    //console.log(value,length,total);
                    var etherInTeir = web3.fromWei(value,'ether').toNumber() * length;
                    //console.log(etherInTeir);
                    
                    ether += etherInTeir;
                    bids += length;
                    
                    if(bids > (40*52))
                        i = promises.length;
                }
                
                //console.log(ether,bids);
                
                if(bids == 0)
                    $scope.medao.salary = 0;
                else
                    $scope.medao.salary = (ether / bids) * 40 * 52;

            }).catch(function(err){
                console.error(err);
            });
        }
        
        $scope.loaded = true;
    }).catch(function(err){
        console.error(err);
        alert("Failed to load your account from web3! Make sure you are logged into your account and then refresh the page.");
    });
    
    $scope.$watch('medao.name', function(){
        ////console.log($scope.medao.name);
        if($scope.medao.name.length > 0 && $scope.medao.name != 'Enter Your Name' && $scope.medao.name != null)
            $scope.medao.valid = true;
        else
            $scope.medao.valid = false;
    });
    
    $scope.validateSearch = function(address){
        if(web3.isAddress(address)) {
            $scope.goto(address + '/medao');
            $scope.search.isValidAddress = true;
        } else
            $scope.search.isValidAddress = false;
    };
    
    $scope.goto = function(path){
        $location.path(path);
    };

    $scope.onFocus = function(){
        $scope.dotted = false;
        if($scope.medao.name == 'Enter Your Name')
            $scope.medao.name = '';
    }
    
    $scope.onBlur = function(){
        if($scope.medao.name == '') {
            $scope.dotted = true;
            $scope.medao.name = 'Enter Your Name';
        } else {
            $scope.dotted = false;
        }
    }
}]);