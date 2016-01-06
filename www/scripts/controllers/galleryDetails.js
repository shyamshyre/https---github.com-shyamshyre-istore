/**
 * Created by Swetha on 12/28/2015.
 */
app.controller('galleryDetailsController',[
  '$scope',
  '$state',
  '$stateParams',
  '$ionicSideMenuDelegate',

  function($scope,$state,$stateParams, $ionicSideMenuDelegate) {
  $scope.itemSelected = $stateParams.itemSelected;
    $scope.item =$stateParams.item;
    $scope.products  =$stateParams.products;
  }]);
