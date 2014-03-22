define([
  'underscore',
  'backbone',
], function (_, Backbone) {
  'use strict';

  var ModelModel = Backbone.Model.extend({
    initialize: function () {
      console.log('ModelModel: initialize');
    },

    url: function() {
      return '/api/model/' + this.get('id');
    },

    getInputURL: function () {
      var url = '/datasets/watersheds/' + this.get('watershed').id + '/dataset.csv';
      return url;
    }
  });

  return ModelModel;
});
