
var app = angular.module('ionicShopCtrl', ['ionic', 'ionicShop','ionic-ratings']);

app.run(function ($ionicPlatform, stripeCheckout, $http) {
    $ionicPlatform.ready(function () {
        // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
        // for form inputs)
        if (window.cordova && window.cordova.plugins.Keyboard) {
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        }

        if (window.StatusBar) {
            StatusBar.styleDefault();
        }
    });

    stripeCheckout.setStripeKey('pk_test_hXnwnglXuPWNu5NRmmJJdrwX');

    stripeCheckout.setStripeTokenCallback = function (status, response, products) {
        console.log(status, response, products);
        $http.post('/stripe/pay', {
            stripeToken: response.id,
            products: products
        })
        .success(function (data) {
            console.log(data);
        });
    };

});

app.config(function ($stateProvider, $urlRouterProvider) {

    $stateProvider
      .state('cart', {
          url: '/cart',
          templateUrl: 'views/cart.html',
          controller: 'CartController'
      })
      .state('checkout', {
          url: '/checkout',
          templateUrl: 'views/checkout.html',
          controller: 'CheckoutController'
      })
      .state('gallery', {
          url: '/gallery',
          templateUrl: 'views/gallery.html',
          controller: 'GalleryController'
      })
      .state('address', {
          url: '/address',
          templateUrl: 'views/address.html',
          controller: 'AddressController'
      })
      .state('userInformation', {
          url: '/userInformation',
          templateUrl: 'views/userInformation.html',
          controller: 'userInformationController'
      })
      .state('searchFilter', {
          url: '/searchFilter',
          templateUrl: 'views/searchFilter.html',
          controller: 'searchFilterController'
      })
      .state('locationFinder', {
          url: '/locationFinder',
          templateUrl: 'views/locationFinder.html',
          controller: 'locationFinderController'
      })
      .state('login', {
          url: '/login',
          templateUrl: 'views/Login.html',
          controller: 'LoginController'
      })
      .state('galleryDetails', {
          url: '/galleryDetails',
          templateUrl: 'views/galleryDetails.html',
          params: { itemSelected: false, item: null, products: null },
          controller: 'galleryDetailsController'
      })
      .state('registration', {
          url: '/registration',
          templateUrl: 'views/Registration.html',
          controller: 'RegistrationController'
      });

    $urlRouterProvider.otherwise('gallery');

});
