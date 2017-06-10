MeDao.service('MeDaoRegistry', ['$q','Web3Service',
function ($q,Web3Service) {
    console.log('Loading MeDao Register');
    
    var MeDaoRegistryContractAddress = '0xa893B03acE726e6F451ADAc0a1482E53Dca23d85'; //TestNet
    var MeDaoRegistryContract = web3.eth.contract(
        [{"constant":true,"inputs":[],"name":"total_daos","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"medaos","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"mes","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"name","type":"string"}],"name":"register","outputs":[],"payable":false,"type":"function"},{"inputs":[{"name":"Token","type":"address"}],"payable":false,"type":"constructor"}]
    );
    var MeDaoRegistryInstance = MeDaoRegistryContract.at(MeDaoRegistryContractAddress);
    
    var getGasPrice = Web3Service.getGasPrice();
        
    var service = {
        register: function(name){
            var deferred = $q.defer();
            
            var promises = [Web3Service.getCurrentAccount(),Web3Service.getGasPrice()];
            
            $q.all(promises).then(function(array){
                var account = array[0]
                var gasPrice = array[1];
                MeDaoRegistryInstance.register(name, {from:account,gasPrice:gasPrice},
                function(err, tx){
                    if(!err)
                        deferred.resolve(tx);
                    else 
                        deferred.reject(err);
                });
            }).catch(function(err){
                deferred.reject(err);
            });
            
            return deferred.promise;
        },
        getMeDaoAddress: function(account){
            var deferred = $q.defer();
            
            MeDaoRegistryInstance.medaos(account,
            function(err, account){
                if(!err)
                    deferred.resolve(account);
                else 
                    deferred.reject(err);
            });
            
            return deferred.promise;
        }
    }
    
    return service;
}]);