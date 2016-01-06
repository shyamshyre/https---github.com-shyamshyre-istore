
app.controller('LoginController',['$scope', '$state', '$ionicSideMenuDelegate',
  function($scope, $state, $ionicSideMenuDelegate){
    $scope.gotoMenu=function(){
      $ionicSideMenuDelegate.toggleLeft();
    };
    $scope.goToGallery = function () {
        $state.go('gallery');
    };
  }]);
