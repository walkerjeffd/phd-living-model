define([
  'jquery',
  'bootstrap',
  'app/router'
], function ($, Bootstrap, Router) {
  'use strict';

  var initialize = function() {
    console.log('App initialized');

    var router = new Router();
    
    Backbone.history.start({ root: '/models' });
  };

  return {
      initialize: initialize
  };
});