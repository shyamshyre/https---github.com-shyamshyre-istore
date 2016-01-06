/**
 * Created by ITRON on 12/31/2015.
 */

app.controller('RegistrationController',['$scope', '$state', '$ionicSideMenuDelegate', 'Products','stripeCheckout',
  function($scope, $state, $ionicSideMenuDelegate, Products, stripeCheckout){
    $scope.gotoMenu=function(){
      $ionicSideMenuDelegate.toggleLeft();
    };
  }]);
