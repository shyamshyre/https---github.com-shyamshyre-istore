(function (angular) {
    //Service Module for ionic-shop
    var app = angular.module('ionicShop.services', ['ionic']);
    //PRODUCT SERVICE HOLDING ALL ITEMS
    app.filter('startsWithLetter', function () {
        return function (products, value) {
            var filtered = [];
            var letterMatch = new RegExp(value, 'i');
            for (var i = 0; i < products.length; i++) {
                var item = products[i];
                if (letterMatch.test(item.title)) {
                    filtered.push(item);
                }
            }
            return filtered;
        };
    });
    app.service('Products', ['$http', function ($http) {
        this.galleryProducts = [];
        this.cartProducts = [];
        this.checkout = {};
        var menuItems = [
          { name: 'Cart', url: 'http://localhost:8100/#/cart', data: '10' },
          { name: 'Gallery', url: 'http://localhost:8100/#/gallery', data: '10' },
          { name: 'Address', url: 'http://localhost:8100/#/address', data: '10' },
          { name: 'UserInformation', url: 'http://localhost:8100/#/userInformation', data: '10' },
          { name: 'SearchFilter', url: 'http://localhost:8100/#/searchFilter', data: '10' },
          { name: 'LocationFinder', url: 'http://localhost:8100/#/locationFinder', data: '10' },
          { name: 'checkout', url: 'http://localhost:8100/#/checkout', data: '10' },
          { name: 'Login', url: 'http://localhost:8100/#/login', data: '10' },
          { name: 'Registration', url: 'http://localhost:8100/#/registration', data: '10' }]

        this.addToCart = function (product) {
            var productInCart = false;
            this.cartProducts.forEach(function (prod, index, prods) {
                if (prod.id === product.id) {
                    productInCart = prod;
                    return;
                }
            });

            if (productInCart) {
                this.addOneProduct(productInCart);
            } else {
                product.purchaseQuantity = 0;
                this.addOneProduct(product);
                this.cartProducts.push(product);
            }
        };

        this.removeProduct = function (product) {
            this.cartProducts.forEach(function (prod, i, prods) {
                if (product.id === prod.id) {
                    this.cartProducts.splice(i, 1);
                    this.updateTotalandQunatity();
                }
            }.bind(this));
        };

        this.addOneProduct = function (product) {
            --product.quantity;
            ++product.purchaseQuantity;

            this.updateTotalandQunatity();
        };

        this.removeOneProduct = function (product) {
            ++product.quantity;
            --product.purchaseQuantity;
            this.updateTotalandQunatity();
        };

        this.cartTotal = function () {
            var total = 0;
            this.cartProducts.forEach(function (prod, index, prods) {
                total += prod.price * prod.purchaseQuantity;
            });

            return formatTotal(total);
        };
        this.quantity = function () {
            var total = 0;
            this.cartProducts.forEach(function (prod, index, prods) {
                total += prod.purchaseQuantity;
            });

            return formatTotal(total);
        };
        var formatTotal = function (total) {
            return total.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
        };

        this.updateTotalandQunatity = function () {
            this.total = this.cartTotal();
            this.totalQuantity = this.quantity();
        }.bind(this);

        this.updateTotalandQunatity();

        this.getProducts = function (callback) {
            $http.get('/admin/panel/products')
            .success(function (products) {
                this.galleryProducts = products;
                if (callback) { callback(); }
            }.bind(this));
        };

        this.getBarNames = function () {

            var sideBarNames = [];
            angular.forEach(menuItems, function (item) {
                sideBarNames.push(item);
            });
            return sideBarNames;
        };

    }]);

    //CHECKOUT VALIDATION SERVICE
    app.service('CheckoutValidation', function () {

        this.validateCreditCardNumber = function (cc) {
            return Stripe.card.validateCardNumber(cc);
        };

        this.validateExpiry = function (month, year) {
            return Stripe.card.validateExpiry(month, year);
        };

        this.validateCVC = function (cvc) {
            return Stripe.card.validateCVC(cvc);
        };

        this.validateEmail = function (email) {
            var emailReg = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            return emailReg.test(email);
        };

        this.validateZipcode = function (zipcode) {
            var zipReg = /(^\d{5}$)|(^\d{5}-\d{4}$)/;
            return zipReg.test(zipcode);
        };

        this.checkAll = function (checkoutDetails) {
            if (Object.keys(checkoutDetails).length === 0) { return false; }
            for (var input in checkoutDetails) {
                /* Check validation for credit card number */
                if (input === 'cc' && !this.validateCreditCardNumber(checkoutDetails[input])) {
                    return false;
                }
                /* Check validation for expiration date on credit card */
                if (input === 'exp' && !this.validateExpiry(checkoutDetails[input].slice(0, 2), checkoutDetails[input].slice(3))) {
                    return false;
                }
                /* Check validation for cvc number on credit card */
                if (input === 'cvc' && !this.validateCVC(checkoutDetails[input])) {
                    return false;
                }

                if (input === 'email' && !this.validateEmail(checkoutDetails[input])) {
                    return false;
                }

                if (input === 'zipcode' && !this.validateZipcode(checkoutDetails[input])) {
                    return false;
                }
            }
            return true;
        }.bind(this);
    });

    //STRIPE INTEGRATION SERVICE
    app.service('stripeCheckout', ['Products', 'CheckoutValidation', '$http', function (Products, CheckoutValidation, $http) {

        this.setStripeKey = function (key) {
            Stripe.setPublishableKey(key);
        };

        this.setStripeTokenCallback = function () {

        };

        this.processCheckout = function (checkoutDetails, callback) {
            var cc = checkoutDetails.cc;
            var month = checkoutDetails.exp.slice(0, 2);
            var year = checkoutDetails.exp.slice(3);
            var cvc = checkoutDetails.cvc;

            Stripe.card.createToken({
                number: cc,
                cvc: cvc,
                exp_month: month,
                exp_year: year
            }, callback);
        };

        this.stripeCallback = function (status, response) {
            this.setStripeTokenCallback(status, response);
        }.bind(this);

        var pay = function (response) {
            var token = response.id;
            url = '/stripe/pay';
            $http.post(url, { stripeToken: token });
        };

    }]);

})(angular);
(function (angular) {

    //IONIC CART DIRECTIVE
    var app = angular.module('ionicShop.directives', ['ionic', 'ionicShop.services']);

    app.directive('ionCart', ['Products', '$templateCache', function (Products, $templateCache) {
        var link = function (scope, element, attr) {
            scope.$watch('products.length', function (newVal, oldVal) {
                Products.updateTotalandQunatity();
                scope.emptyProducts = newVal > 0 ? false : true;
            });

            scope.emptyProducts = scope.products.length ? false : true;

            scope.addProduct = function (product) {
                Products.addOneProduct(product);
            };

            scope.removeProduct = function (product) {
                product.purchaseQuantity <= 1 ? Products.removeProduct(product) : Products.removeOneProduct(product);
            };
        };

        return {
            restrict: 'AEC',
            templateUrl: 'cart-item.html',
            link: link,
            scope: {
                products: '='
            }
        };
    }]);
    app.directive('ionDescription', ['Products', '$templateCache', function (Products, $templateCache) {
        var link = function (scope, element, attr) {
            scope.$watch('products.length', function (newVal, oldVal) {
                Products.updateTotalandQunatity();
                scope.emptyProducts = newVal > 0 ? false : true;
            });

            scope.emptyProducts = scope.products.length ? false : true;

            scope.addProduct = function (product) {
                Products.addOneProduct(product);
            };

            scope.removeProduct = function (product) {
                product.purchaseQuantity <= 1 ? Products.removeProduct(product) : Products.removeOneProduct(product);
            };
        };

        return {
            restrict: 'AEC',
            templateUrl: 'cart-description.html',
            link: link,
            scope: {
                products: '='
            }
        };
    }]);
    app.directive('ionProductImage', ['$timeout', '$ionicModal', '$ionicSlideBoxDelegate', '$templateCache', function ($timeout, $ionicModal, $ionicSlideBoxDelegate, $templateCache) {
        var link = function (scope, element, attr) {

            scope.closeModal = function () {
                scope.modal.hide();
                scope.modal.remove();
            };

            element.on('click', function () {
                $ionicModal.fromTemplateUrl('partials/cart-image-modal.html', {
                    animation: 'slide-left-right',
                    scope: scope
                })
                .then(function (modal) {
                    scope.modal = modal;
                    scope.modal.show();
                    $timeout(function () {
                        $ionicSlideBoxDelegate.update();
                    });
                });
            });
        };

        return {
            restrict: 'A',
            link: link,
            scope: '='
        };
    }]);

    // IONIC CHECKOUT DIRECTIVE
    app.directive('ionCartFooter', ['$state', '$templateCache', function ($state, $templateCache) {
        var link = function (scope, element, attr) {

            element.addClass('bar bar-footer bar-dark');
            element.on('click', function (e) {
                if (scope.path) {
                    $state.go(scope.path);
                }
            });

            element.on('touchstart', function () {
                element.css({ opacity: 0.8 });
            });

            element.on('touchend', function () {
                element.css({ opacity: 1 });
            });
        };

        return {
            restrict: 'AEC',
            templateUrl: 'cart-footer.html',
            scope: {
                path: '=path'
            },
            link: link
        };
    }]);

    // IONIC PURCHASE DIRECTIVE
    app.directive('ionCheckout', ['Products', '$templateCache', function (Products, $templateCache) {
        var link = function (scope, element, attr) {
            scope.$watch(function () {
                return Products.total;
            }, function () {
                scope.total = Products.total;
            });

            scope.checkout = Products.checkout;
            //*** Total sum of products in usd by default ***\\
            scope.total = Products.total;
            //*** Add address input fields when has-address attribute is on ion-purchase element ***\\
            if (element[0].hasAttribute('has-address')) { scope.hasAddressDir = true; }
            //*** Add email input field when has-email attribute is on ion-purchase element ***\\
            if (element[0].hasAttribute('has-email')) { scope.hasEmailDir = true; }
            //*** Add name input fields when has-name attribute is on ion-purchase element ***\\
            if (element[0].hasAttribute('has-name')) { scope.hasNameDir = true; }
        };

        return {
            restrict: 'AEC',
            templateUrl: 'checkout.html',
            link: link
        };
    }]);

    app.directive('ionGallery', ['Products', '$templateCache', '$state', function (Products, $templateCache, $state) {
        var link = function (scope, element, attr) {

            scope.addToCart = function (product) {
                Products.addToCart(product);
            };
            scope.viewDetails = function (selectedItem) {
                var selectedProduct = selectedItem.id;
                scope.proid = selectedProduct;
                angular.forEach(scope.products, function (value, key) {
                    if (value.id === parseInt(scope.proid)) {
                        var item = [];
                        item.push({ itemDescription: value.description, itemtitle: value.title, itemprice: value.price, itemimage: value.images[0] });
                        scope.itemvalue = item;
                        scope.itemSelected = true;
                        itemSelected = scope.itemSelected;
                        $state.go('galleryDetails', { itemSelected: itemSelected, item: scope.itemvalue[0], products: scope.products[0] });
                    }
                });
            }
        };

        return {
            restrict: 'AEC',
            templateUrl: 'gallery-item.html',
            link: link,
            scope: {
                products: '=',
                value: '='
            }
        };

    }]);
    /*changes done by rakesh*/
    app.directive('sideMenu', ['Products', '$state', '$templateCache', function (Products, $state, $templateCache) {
        var link = function (scope, state) {
            scope.Tabs = Products.getBarNames();
            scope.redirect = function (tab) {
                window.location = tab.url;
            };
        };
        return {
            restrict: 'AE',
            templateUrl: 'partials/side-menu.html',
            link: link
        };

    }]);
    app.directive('userName', ['Products', '$state', '$templateCache', function (Products, $state, $templateCache) {
        var link = function (scope, state) {
        };
        return {
            restrict: 'AE',
            templateUrl: 'partials/userName.html',
            link: link
        };

    }]);
    app.directive('password', ['Products', '$state', '$templateCache', function (Products, $state, $templateCache) {
        var link = function (scope, state) {
        };
        return {
            restrict: 'AE',
            templateUrl: 'partials/password.html',
            link: link
        };

    }]);
    app.directive('loginSubmit', ['Products', '$state', '$templateCache', function (Products, $state, $templateCache) {
        var link = function (scope, state) {
        };
        return {
            restrict: 'AE',
            templateUrl: 'partials/login-submit.html',
            link: link
        };

    }]);
    app.directive('loginTemplate', ['Products', '$state', '$templateCache', function (Products, $state, $templateCache) {
        var link = function (scope, state) {
        };
        return {
            restrict: 'AE',
            templateUrl: 'partials/login-template.html',
            link: link
        };

    }]);
    app.directive('facebook', ['Products', '$state', '$templateCache', function (Products, $state, $templateCache) {
        var link = function (scope, state) {
        };
        return {
            restrict: 'AE',
            templateUrl: 'partials/facebook.html',
            link: link
        };

    }]);
    app.directive('googlePlus', ['Products', '$state', '$templateCache', function (Products, $state, $templateCache) {
        var link = function (scope, state) {
        };
        return {
            restrict: 'AE',
            templateUrl: 'partials/googlePlus.html',
            link: link
        };

    }]);
    app.directive('socialTemplate', ['Products', '$state', '$templateCache', function (Products, $state, $templateCache) {
        var link = function (scope, state) {
        };
        return {
            restrict: 'AE',
            templateUrl: 'partials/socialTemplate.html',
            link: link
        };

    }]);
    app.directive('search', ['Products', '$state', '$templateCache', function (Products, $state, $templateCache) {
        var link = function (scope, state) {
        };
        return {
            restrict: 'AE',
            templateUrl: 'partials/search.html',
            link: link
        };

    }]);
    app.directive('filter', ['Products', '$state', '$templateCache', function (Products, $state, $templateCache) {
        var link = function (scope, state) {
        };
        return {
            restrict: 'AE',
            templateUrl: 'partials/filter.html',
            link: link
        };

    }]);
    app.directive('slides', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
            scope.images = ['images/leica.jpeg', 'images/polaroid.jpg', 'images/nikon.jpg'];
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/slides.html'
        };
    }]);
    app.directive('ionRegistration', ['Products', '$state', '$templateCache', function (Products, $state, $templateCache) {
        var link = function (scope, state) {

        };
        return {
            restrict: 'AE',
            templateUrl: 'partials/registration.html',
            link: link
        };

    }]);
    app.directive('firstName', ['Products', '$state', '$templateCache', function (Products, $state, $templateCache) {
        var link = function (scope, state) {
        };
        return {
            restrict: 'AE',
            templateUrl: 'partials/firstName.html',
            link: link
        };

    }]);

    app.directive('lastName', ['Products', '$state', '$templateCache', function (Products, $state, $templateCache) {
        var link = function (scope, state) {
        };
        return {
            restrict: 'AE',
            templateUrl: 'partials/lastName.html',
            link: link
        };

    }]);

    app.directive('email', ['Products', '$state', '$templateCache', function (Products, $state, $templateCache) {
        var link = function (scope, state) {
        };
        return {
            restrict: 'AE',
            templateUrl: 'partials/registration-email.html',
            link: link
        };

    }]);

    app.directive('mobileNumber', ['Products', '$state', '$templateCache', function (Products, $state, $templateCache) {
        var link = function (scope, state) {
        };
        return {
            restrict: 'AE',
            templateUrl: 'partials/mobileNumber.html',
            link: link
        };

    }]);

    app.directive('registrationSubmit', ['Products', '$state', '$templateCache', function (Products, $state, $templateCache) {
        var link = function (scope, state) {
        };
        return {
            restrict: 'AE',
            templateUrl: 'partials/registration-submit.html',
            link: link
        };

    }]);
    app.directive('customerInfo', ['$templateCache', function ($templateCache) {
        var link = function (scope) {
            scope.Customer = [];
            scope.Customer.imageURL = "images/canon.jpg";
            scope.Customer.Name = "CustomerName";
            scope.Customer.Email = "Test@test.com";
            scope.Customer.Contact = "2345678901";
        };

        return {
            restrict: 'AE',
            templateUrl: 'partials/customer-info.html',
            link: link
        };

    }]);
    /*changes done by rakesh*/
    //IONIC PURCHASE FOOTER DIRECTIVE
    app.directive('ionCheckoutFooter', ['$compile', 'Products', 'stripeCheckout', 'CheckoutValidation', '$templateCache', function ($compile, Products, stripeCheckout, CheckoutValidation, $templateCache) {
        var link = function (scope, element, attr) {
            scope.checkout = Products.checkout;
            scope.processCheckout = stripeCheckout.processCheckout;
            scope.stripeCallback = stripeCheckout.stripeCallback;

            element.addClass('bar bar-footer bar-dark');

            element.on('click', function () {
                if (CheckoutValidation.checkAll(scope.checkout)) {
                    scope.processCheckout(scope.checkout, scope.stripeCallback);
                } else {
                    var ionPurchaseSpan = document.getElementsByTagName('ion-checkout')[0].children[0];
                    angular.element(ionPurchaseSpan).html('You have invalid fields:').css({ color: '#ED303C', opacity: 1 });
                }
            });

            element.on('touchstart', function () {
                element.css({ opacity: 0.8 });
            });

            element.on('touchend', function () {
                element.css({ opacity: 1 });
            });
        };

        return {
            restrict: 'AEC',
            templateUrl: 'checkout-footer.html',
            link: link
        };
    }]);
    //ADDITIONAL CONTENT DIRECTIVES
    //CHECKOUT CARD GROUP
    app.directive('checkoutCard', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/card-form.html'
        };

    }]);

    // CARD NUM INPUT
    app.directive('cardNumInput', ['$timeout', 'CheckoutValidation', '$templateCache', function ($timeout, CheckoutValidation, $templateCache) {
        var link = function (scope, element, attr) {
            var input = element.children()[0].children[0];
            var icon = element.children()[0].children[1];
            scope.onNumBlur = function () {
                if (!scope.checkout.cc) { return; }
                angular.element(icon).removeClass('ion-card');
                angular.element(icon).addClass('ion-loading-d');
                $timeout(function () {
                    if (!CheckoutValidation.validateCreditCardNumber(scope.checkout.cc)) {
                        angular.element(icon).removeClass('ion-loading-d');
                        angular.element(icon).addClass('ion-close-round').css({ color: '#ED303C' });
                        return;
                    } else {
                        angular.element(icon).removeClass('ion-loading-d');
                        angular.element(icon).addClass('ion-checkmark-round').css({ color: '#1fda9a' });
                    }
                }, 300);
            };

            scope.onNumFocus = function () {
                angular.element(icon).removeClass('ion-checkmark-round ion-close-round');
                angular.element(icon).addClass('ion-card').css({ color: '#333' });
            };
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/card-num-input.html'
        };
    }]);

    // CARD EXPIRATION INPUT
    app.directive('cardExpInput', ['$timeout', 'CheckoutValidation', '$templateCache', function ($timeout, CheckoutValidation, $templateCache) {
        var link = function (scope, element, attr) {
            var input = element.children()[0].children[0];
            var icon = element.children()[0].children[1];
            scope.onExpBlur = function () {
                if (!scope.checkout.exp) { return; }
                angular.element(icon).addClass('ion-loading-d');
                $timeout(function () {
                    if (!scope.checkout.exp || !CheckoutValidation.validateExpiry(scope.checkout.exp.slice(0, 2), scope.checkout.exp.slice(3))) {
                        angular.element(icon).removeClass('ion-loading-d');
                        angular.element(icon).addClass('ion-close-round').css({ color: '#ED303C' });
                        return;
                    } else {
                        angular.element(icon).removeClass('ion-loading-d');
                        angular.element(icon).addClass('ion-checkmark-round').css({ color: '#1fda9a' });
                    }
                }, 300);
            };

            scope.onExpFocus = function () {
                angular.element(icon).removeClass('ion-checkmark-round ion-close-round').css({ color: '#333' });
            };
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/card-exp-input.html'
        };

    }]);

    //CARD CVC INPUT
    app.directive('cardCvcInput', ['$timeout', 'CheckoutValidation', '$templateCache', function ($timeout, CheckoutValidation, $templateCache) {
        var link = function (scope, element, attr) {
            var input = element.children()[0].children[0];
            var icon = element.children()[0].children[1];
            scope.onCvcBlur = function () {
                if (!scope.checkout.cvc) { return; }
                angular.element(icon).addClass('ion-loading-d');
                $timeout(function () {
                    if (!CheckoutValidation.validateCVC(scope.checkout.cvc)) {
                        angular.element(icon).removeClass('ion-loading-d');
                        angular.element(icon).addClass('ion-close-round').css({ color: '#ED303C' });
                        return;
                    } else {
                        angular.element(icon).removeClass('ion-loading-d');
                        angular.element(icon).addClass('ion-checkmark-round').css({ color: '#1fda9a' });
                    }
                }, 300);
            };

            scope.onCvcFocus = function () {
                angular.element(icon).removeClass('ion-checkmark-round ion-close-round').css({ color: '#333' });
            };

        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/card-cvc-input.html'
        };
    }]);

    // ADDRESS GROUP
    app.directive('checkoutAddress', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/address.html'
        };

    }]);

    app.directive('ionAddress', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/ion-address.html'
        };
    }]);

    app.directive('innerAddress', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/inner-address.html'
        };
    }]);

    app.directive('addAddress', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/add-address.html'
        };
    }]);

    app.directive('addressLine1', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/address-line-1.html'
        };
    }]);

    app.directive('addressLine2', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/address-line-2.html'
        };
    }]);

    app.directive('addressLine3', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/address-line-3.html'
        };
    }]);

    app.directive('tagAddress', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/tag-address.html'
        };
    }]);

    app.directive('home', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/home.html'
        };
    }]);

    app.directive('work', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/work.html'
        };
    }]);

    app.directive('other', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/other.html'
        };
    }]);

    app.directive('ionAddressFooter', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'ion-address-footer.html'
        };
    }]);


    app.directive('ionUser', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/ion-user.html'
        };
    }]);

    app.directive('swiggyMoney', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/swiggy-money.html'
        };
    }]);

    app.directive('amount', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/amount.html'
        };
    }]);

    app.directive('contactInformation', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/contact-information.html'
        };
    }]);

    app.directive('email', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/email.html'
        };
    }]);

    app.directive('phoneNumber', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/phoneNumber.html'
        };
    }]);

    app.directive('noSavedAddress', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/no-saved-address.html'
        };
    }]);

    app.directive('ionUserFooter', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'ion-user-footer.html'
        };
    }]);

    app.directive('ionSearchFilter', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
        };

        return {
            restrict: 'AEC',
            templateUrl: 'search-filter.html',
            link: link,

        };
    }]);

    app.directive('ionLocationAddress', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
        };

        return {
            restrict: 'AEC',
            templateUrl: 'partials/ion-location-address.html',
            link: link,

        };
    }]);

    app.directive('useGps', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
        };

        return {
            restrict: 'AEC',
            templateUrl: 'partials/ion-use-gps.html',
            link: link,

        };
    }]);

    app.directive('pickLocation', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
        };

        return {
            restrict: 'AEC',
            templateUrl: 'partials/ion-pick-location.html',
            link: link,

        };
    }]);

    //ADDRESS LINE ONE INPUT
    app.directive('addressOneInput', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/address-line-one.html'
        };
    }]);

    // ADDRESS LINE TWO INPUT
    app.directive('addressTwoInput', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {

            scope.onAddrTwoBlur = function () {

            };

            scope.onAddrTwoFocus = function () {

            };
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/address-line-two.html'
        };
    }]);

    //CITY INPUT
    app.directive('cityInput', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
            scope.onCityBlur = function () {

            };

            scope.onCityFocus = function () {

            };
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/city-input.html'
        };
    }]);

    // STATE INPUT
    app.directive('stateInput', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
            scope.onStateBlur = function () {

            };

            scope.onStateFocus = function () {

            };
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/state-input.html'
        };
    }]);

    //ZIP INPUT
    app.directive('zipInput', ['$timeout', 'CheckoutValidation', '$templateCache', function ($timeout, CheckoutValidation, $templateCache) {
        var link = function (scope, element, attr) {
            var icon = element.children()[0].children[1];
            scope.onZipBlur = function () {
                if (!scope.checkout.zipcode) { return; }
                angular.element(icon).addClass('ion-loading-d');
                $timeout(function () {
                    if (!CheckoutValidation.validateZipcode(scope.checkout.zipcode)) {
                        angular.element(icon).removeClass('ion-loading-d');
                        angular.element(icon).addClass('ion-close-round').css({ color: '#ED303C' });
                        return;
                    } else {
                        angular.element(icon).removeClass('ion-loading-d');
                        angular.element(icon).addClass('ion-checkmark-round').css({ color: '#1fda9a' });
                    }
                }, 300);
            };

            scope.onZipFocus = function () {
                angular.element(icon).removeClass('ion-checkmark-round ion-close-round').css({ color: '#333' });
            };

        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/zipcode-input.html'
        };
    }]);

    //NAME GROUP

    app.directive('checkoutName', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/name-input.html'
        };
    }]);


    //FIRST NAME
    app.directive('lastNameInput', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/first-name-input.html'
        };
    }]);

    //LAST NAME
    app.directive('firstNameInput', ['$templateCache', function ($templateCache) {
        var link = function (scope, element, attr) {
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/last-name-input.html'
        };
    }]);

    //EMAIL GROUP
    app.directive('checkoutEmail', ['$timeout', 'CheckoutValidation', '$templateCache', function ($timeout, CheckoutValidation, $templateCache) {
        var link = function (scope, element, attr) {
            var icon = element.children()[1].children[1];
            scope.onEmailBlur = function () {
                if (!scope.checkout.email) { return; }
                angular.element(icon).addClass('ion-loading-d');
                $timeout(function () {
                    if (!CheckoutValidation.validateEmail(scope.checkout.email)) {
                        angular.element(icon).removeClass('ion-loading-d');
                        angular.element(icon).addClass('ion-close-round').css({ color: '#ED303C' });
                        return;
                    } else {
                        angular.element(icon).removeClass('ion-loading-d');
                        angular.element(icon).addClass('ion-checkmark-round').css({ color: '#1fda9a' });
                    }
                }, 300);
            };

            scope.onEmailFocus = function () {
                angular.element(icon).removeClass('ion-checkmark-round ion-close-round').css({ color: '#333' });
            };
        };

        return {
            restrict: 'AE',
            link: link,
            templateUrl: 'partials/email-input.html'
        };
    }]);
    // CUSTOMIZATION DIRECTIVES
    app.directive('mouseDownUp', function () {
        var link = function (scope, element, attr) {

            element.on('touchstart', function () {
                element.css({ opacity: 0.5 });
            });

            element.on('touchend', function () {
                element.css({ opacity: 1 });
            });

        };

        return {
            restrict: 'AC',
            link: link
        };
    });

    app.directive('cartAdd', ['$timeout', function ($timeout) {
        var link = function (scope, element, attr) {
            scope.addText = 'Add To Cart';

            element.on('click', function () {
                scope.addText = 'Added';
                element.addClass('gallery-product-added');
                $timeout(function () {
                    scope.addText = 'Add To Cart';
                    element.removeClass('gallery-product-added');
                }, 500);
            });
        };

        return {
            restrict: 'AC',
            link: link,
            scope: true
        };
    }]);

})(angular);

(function (angular) {
    angular.module("ionicShop.templates", []).run(["$templateCache", function ($templateCache) {
        $templateCache.put("cart-footer.html", "<div class=\'title cart-footer\'>Checkout</div>");
        $templateCache.put("partials/userName.html", "<label class='item item-input'><input type='text' placeholder='User Name'></label>");
        $templateCache.put("partials/password.html", "<label class='item item-input'><input type='password' placeholder='Password'></label>");
        $templateCache.put("partials/login-submit.html", "<button class='button button-small button-positive col' ng-click='goToGallery()'>Submit</button>");
        $templateCache.put("partials/login-template.html", "<div class='list'><div class='list list-inset'><user-name></user-name><password></password></div><login-submit></login-submit></div>");
        $templateCache.put("partials/facebook.html", "<button class='button button-icon icon ion-social-facebook' style='color:#FFFFFF;background-color:#697EB2;width: 49%;'></button>&nbsp;");
        $templateCache.put("partials/googlePlus.html", "<button class='button button-icon icon ion-social-googleplus' style='color: #FFFFFF;background-color:#D76A5D;width: 49%;'></button>");
        $templateCache.put("partials/socialTemplate.html", "<div><facebook></facebook><google-plus></google-plus></div>");
        $templateCache.put("partials/search.html", "<label class='item-input-wrapper bar-clear'><i class='icon ion-search placeholder-icon'></i><input type='search' placeholder='Search Item'></label>");
        $templateCache.put("partials/filter.html", "<button class='button button-clear ion-funnel'></button>");
        $templateCache.put("partials/slides.html", "<ion-slide-box does-continue=\'true\' auto-play=\'true\'><ion-slide ng-repeat=\'image in images\'><div class=\'image-slide-div text-center\'><img ng-src=\'{{image}}\' class=\'image-slide\'></div></ion-slide></ion-slide-box>");
        $templateCache.put("partials/registration.html", "<div class='list'><div class='list list-inset'><first-name></first-name><last-name></last-name><email></email><mobile-number></mobile-number></div><registration-submit></registration-submit></div>");
        $templateCache.put("partials/firstName.html", "<label class='item item-input'><input type='text' placeholder='First Name'></label>");
        $templateCache.put("partials/lastName.html", "<label class='item item-input'><input type='text' placeholder='Last Name'></label>");
        $templateCache.put("partials/registration-email.html", "<label class='item item-input'><input type='text' placeholder='Email'></label>");
        $templateCache.put("partials/mobileNumber.html", "<label class='item item-input'><input type='text' placeholder='mobileNumber'></label>");
        $templateCache.put("partials/registration-submit.html", "<button class='button button-small button-positive col'>Submit</button>");
        $templateCache.put("cart-item.html", "<div ng-if=\'!emptyProducts\'>\n  <div class=\'card product-card\' ng-repeat=\'product in products track by $index\'>\n    <div class=\'item item-thumbnail-right product-item\'>\n<img ng-src=\'{{product.images[0]}}\' class=\'product-image\' ion-product-image=\'product\'>\n      <h3 class=\'product-title\'>{{product.title}}</h3>\n      <p class=\'product-description\'>{{product.description}}</p>\n\n      <i class=\'icon ion-plus-round icon-plus-round\' mouse-down-up ng-click=\'addProduct(product)\'></i>\n         <span class=\'product-quantity\'>{{product.purchaseQuantity}}</span>\n      <i class=\'icon ion-minus-round icon-minus-round\' mouse-down-up ng-click=\'removeProduct(product)\'></i>\n\n      <span class=\'product-price\'>${{product.price*product.purchaseQuantity}}</span>\n    </div>\n  </div>\n  <div>\n    <br><br><br><br>\n  </div>\n</div>\n\n<div class=\'empty-cart-div\' ng-if=\'emptyProducts\'>\n  <h3 class=\'empty-cart-header\'>Your bag is empty!</h3>\n  <i class=\'icon ion-bag empty-cart-icon\'></i>\n</div>");
        $templateCache.put("cart-description.html", "<div ng-if='!emptyProducts'><div class='card product-card' ng-repeat='product in products track by $index'><div class='item item-thumbnail-right product-item'><img ng-src='{{product.images[0]}}' class='product-image' ion-product-image='product'><h3 class='product-title'>{{product.title}}</h3><br /><p class='product-description'>{{product.description}}</p><br /><div><span class='product-quantity'>{{product.purchaseQuantity}}*{{product.price}}</span></div><br /><span class='product-price'>${{product.price*product.purchaseQuantity}}</span></div></div></div><div class='empty-cart-div' ng-if='emptyProducts'><h3 class='empty-cart-header'>Your bag is empty!</h3><i class='icon ion-bag empty-cart-icon'></i></div>");
        $templateCache.put("checkout-footer.html", "<div class=\'title purchase-footer\'>Pay</div>");
        $templateCache.put("checkout.html", "\n<span class=\'checkout-form-description\'>Please enter your credit card details:</span>\n\n<div class=\'list checkout-form\'>\n  <checkout-name ng-if=\'hasNameDir\'></checkout-name>\n  <checkout-card></checkout-card>\n  <checkout-address ng-if=\'hasAddressDir\'></checkout-address>\n  <checkout-email ng-if=\'hasEmailDir\'></checkout-email>\n</div>\n\n<h2 class=\'checkout-total\'>Total: ${{total}}</h2>\n");
        $templateCache.put("gallery-item.html", "<div class='list'><div class='card item item-avatar' ng-repeat='product in products | startsWithLetter : value'><img ng-src='{{product.images[0]}}' class='gallery-product-image' ng-click='viewDetails(product)'><h3 class='gallery-product-title'>{{product.title}}</h3><h3 class='gallery-product-price'>${{product.price}}</h3><div class='button button-balanced button-small' style='float:right;' ng-click=\'addToCart(product)\'>Add To Cart</div></div></div>");
        $templateCache.put("partials/side-menu.html", "<div ng-repeat='tab in Tabs track by $index'><div class=\'item item-tab item-icon-left\' ng-click='redirect(tab)'>{{tab.name}}</div></div>");
        $templateCache.put("partials/customer-info.html", "<div class=\'list\'><div class=\'item item-avatar\'><img class='img-circle' ng-src=\'{{Customer.imageURL}}\'><h2>{{Customer.Name}}</h2><p>{{Customer.Email}}</p><p>{{Customer.Contact}}</p></div></div>");
        $templateCache.put("partials/address-line-one.html", "<label class=\'item item-input address-line-one\'>\n  <input type=\'text\' ng-model=\'checkout.addressLineOne\' placeholder=\'Address Line 1\'>\n</label>");
        $templateCache.put("partials/address-line-two.html", "<label class=\'item item-input address-line-two\'>\n  <input type=\'text\' ng-model=\'checkout.addressLineTwo\' placeholder=\'Address Line 2\'>\n</label>");
        $templateCache.put("partials/address.html", "<div class=\'item item-divider\'>Address: </div>\n<address-one-input></address-one-input>\n<address-two-input></address-two-input>\n<city-input></city-input>\n<state-input></state-input>\n<zip-input></zip-input>\n");
        $templateCache.put("partials/ion-address.html", "<inner-address></inner-address>");
        $templateCache.put("ion-address-footer.html", "<button class=\'button button-block button-balanced\'>Save </button>");
        $templateCache.put("partials/ion-user.html", "<div class=\'list\'>\n<swiggy-money></swiggy-money>\n<amount></amount></div><div class=\'list card\'>\n<contact-information></contact-information>\n<email></email>\n<phone-number></phone-number></div><div class=\'list\'>\n<no-saved-address></no-saved-address></div>");
        $templateCache.put("partials/swiggy-money.html", "<div class='item item-button-right'>Swiggy Money<a class='button icon-left button-clear button-balanced'>INVITE</a></div>");
        $templateCache.put("partials/amount.html", "<div class=\'item item-button-right\'>0</div>");
        $templateCache.put("partials/contact-information.html", "<div class=\'item item-left\'><h2>Contact Information</h2></div>");
        $templateCache.put("partials/email.html", "<a class=\'item item-icon-left\'><i class=\'icon ion-email\'></i>Emil Address </br> pallevinod42@gmail.com </a>");
        $templateCache.put("partials/phoneNumber.html", "<a class=\'item item-icon-left\'><i class=\' icon  ion-android-call\'></i>Registered phone no </br> 9985796802</a>");
        $templateCache.put("partials/no-saved-address.html", "<div class=\'item item-button-right\'>No saved Addresses <a class='button icon-left button-clear button-balanced'>ADD NEW</a></div>");
        $templateCache.put("ion-user-footer.html", "<button class=\'button button-block button-light\'>LOGOUT</button>");
        $templateCache.put("partials/inner-address.html", "<div class=\'list card\'>\n<add-address></add-address>\n<div ><address-line-1></address-line-1>\n<address-line-2></address-line-2>\n<address-line-3></address-line-3>\n</div></div><div class=\'list card\'>\n<tag-address></tag-address>\n <div class=\'item item-body tabs tabs-icon-top \' style='height: 70px'><div class=\'col-90 row\'><home class=\'col-33\'></home>\n<work class=\'col-33\'></work>\n<other class=\'col-33\'></other></div></div></div>\n");
        $templateCache.put("partials/ion-location-address.html", "<div class=\'list card\'><use-gps></use-gps><div class=\'item item-body tabs tabs-icon-top \' style='height:70px'><pick-location style='margin-top:30px' ></pick-location></div></div>");
        $templateCache.put("partials/ion-use-gps.html", "<br class=\'item item-left\'><h4>Place pin on your exact delivery location</h4><h4 class=\' item-avatar\' style='margin-left: 40px;color: orange'>Use GPS</h4></div> ");
        $templateCache.put("partials/ion-pick-location.html", "<a class=\'tab-item\' style='color: green;font-size: 15px'>PICK LOCATION</a>");
        $templateCache.put("partials/card-cvc-input.html", "<label class=\'item item-input card-cvc-input\'>\n  <input type=\'tel\' ng-model=\'checkout.cvc\' ng-focus=\'onCvcFocus()\' ng-blur=\'onCvcBlur()\' placeholder=\'CVC\'>\n  <i class=\"icon\" style=\'width: 40px; text-align: center;\'></i>\n</label>");
        $templateCache.put("partials/card-exp-input.html", "<label class=\'item item-input card-exp-input\'>\n  <input type=\'tel\' ng-model=\'checkout.exp\' ng-focus=\'onExpFocus()\' ng-blur=\'onExpBlur()\' placeholder=\'MM/YYYY\'>\n  <i  class=\"icon\" style=\'width: 40px; text-align: center;\'></i>\n</label>");
        $templateCache.put("partials/card-form.html", "<div class=\'item item-divider\'>Card Info: </div>\n<card-num-input></card-num-input>\n<card-exp-input></card-exp-input>\n<card-cvc-input></card-cvc-input>");
        $templateCache.put("partials/card-num-input.html", "<label class=\'item item-input card-num-input\'>\n  <input type=\'tel\' ng-model=\'checkout.cc\' ng-focus=\'onNumFocus()\' ng-blur=\'onNumBlur()\' placeholder=\'Credit Card Number\'>\n  <i  class=\"icon ion-card\" style=\'width: 40px; text-align: center;\'></i>\n</label>");
        $templateCache.put("partials/cart-image-modal.html", "<div class=\"modal image-slider-modal\">\n\n  <ion-header-bar>\n    <button class=\"button button-light icon ion-ios7-undo-outline\" ng-click=\'closeModal()\'></button>\n    <h1 class=\"title\">More Images</h1>\n    \n  </ion-header-bar>\n\n    <ion-slide-box class=\'image-slider-box\' does-continue=\'true\'>\n      <ion-slide ng-repeat=\'image in product.images\' class=\'image-ion-slide\'>\n        <ion-content>\n          <div class=\'image-slide-div\'>\n            <h3 class=\'image-slide-description\'>{{product.description}}</h3>\n            <img src=\'{{image}}\' class=\'image-slide\'>\n          </div>\n        </ion-content>\n      </ion-slide>\n    </ion-slide-box>\n\n</div>");
        $templateCache.put("partials/city-input.html", "<label class=\'item item-input city-input\'>\n  <input type=\'text\' ng-model=\'checkout.city\' placeholder=\'City\'>\n</label>");
        $templateCache.put("partials/email-input.html", "<div class=\"item item-divider\">E-mail: </div>\n<label class=\"item item-input email-input\">\n  <input type=\"text\" ng-model=\"checkout.email\" ng-focus=\'onEmailFocus()\' ng-blur=\'onEmailBlur()\' placeholder=\"E-Mail\">\n  <i class=\"icon\" style=\'width: 40px; text-align: center;\'></i>\n</label>\n\n");
        $templateCache.put("partials/first-name-input.html", "  <label class=\'item item-input first-name-input\'>\n    <input type=\'text\' ng-model=\'checkout.lastName\' placeholder=\'Last Name\'>\n  </label>");
        $templateCache.put("partials/last-name-input.html", "  <label class=\'item item-input last-name-input\'>\n    <input type=\'text\' ng-model=\'checkout.firstName\' placeholder=\'First Name\'>\n  </label>");
        $templateCache.put("partials/name-input.html", "<div class=\'item item-divider\'>Name: </div>\n<first-name-input></first-name-input>\n<last-name-input></last-name-input>");
        $templateCache.put("partials/state-input.html", "<label class=\'item item-input state-input\'>\n  <input type=\'text\' ng-model=\'checkout.state\' placeholder=\'State\'>\n</label>");
        $templateCache.put("partials/add-address.html", "<div class=\'item item-left\'> <h2> Address details</h2></div>");
        $templateCache.put("partials/address-line-1.html", "<label class=\'item item-input item-stacked-label\'> <input type='text' placeholder='John'> </label>");
        $templateCache.put("partials/address-line-2.html", "<label class=\'item item-input item-stacked-label\'> <input type='text' placeholder='John'> </label>");
        $templateCache.put("partials/address-line-3.html", "<label class=\'item item-input item-stacked-label\'> <input type='text' placeholder='John'> </label>");
        $templateCache.put("partials/tag-address.html", "<div class=\'item item-left\'><h2>Tag address as </h2> </div>");
        $templateCache.put("partials/work.html", "<a class=\'tab-item \'><i class=\'icon ion-star\'></i>Work </a>");
        $templateCache.put("partials/home.html", "<a class=\'tab-item \'><i class=\'icon ion-home\'></i>Home</a>");
        $templateCache.put("partials/other.html", "<a class=\'tab-item \'><i class=\'icon ion-gear-a\'></i>Other</a>");
        $templateCache.put("search-filter.html", "<ion-content><div><div class=\'text-center\'><div class=\'item\'>sort Restaurants by</div></div><div class=\'row col-90\'><div class=\'card col-50\'><div class=\'item text-center\'><span class=\'ion-star\'>&nbsp;<h4>Rating</h4></span></div></div><div class=\'card col-50\'><div class=\'item text-center\'><span class=\'ion-clock\'>&nbsp; <h4> Delivery Time</h4></span></div></div></div><div class=\'text-center\'><div class=\'item\'>Select your budget</div></div></div><div class=\'row col-90\'><div class=\'card col-20 text-center\'><div class=\'item\'>0</div></div><div class=\'card col-20 text-center\'><div class=\'item\'>00</div></div><div class=\'card col-20 text-center\'><div class=\'item\'>000 </div></div><div class=\'card col-20 text-center\'> <div class=\'item\'>0000</div></div></div><div><ion-list><div class=\'text-center\'><div class=\'item\'>Select Cuisines</div></div><ion-checkbox>American</ion-checkbox><ion-checkbox>Andhra</ion-checkbox> <ion-checkbox>Bengali</ion-checkbox><ion-checkbox>Biryani</ion-checkbox></ion-list></div></ion-content>");
        $templateCache.put("partials/zipcode-input.html", "<label class=\'item item-input zip-code-input\'>\n  <input type=\'text\' ng-model=\'checkout.zipcode\' ng-focus=\'onZipFocus()\' ng-blur=\'onZipBlur()\' placeholder=\'Zipcode\'>\n  <i class=\"icon zip-code-input-icon\" style=\'width: 40px; text-align: center;\'></i>\n</label>");
    }]);
})(angular);
(function (angular) {

    var app = angular.module('ionicShop', ['ionic', 'ionicShop.services', 'ionicShop.directives', 'ionicShop.templates']);

})(angular);
