define([
  'underscore',
  'backbone',
  'app/models/model'
], function (_, Backbone, ModelModel) {
  'use strict';

  var ModelCollection = Backbone.Collection.extend({
    model: ModelModel,

    url: '/api/model',

    initialize: function () {
      console.log('ModelsCollection: initialize');
    },

    parse: function (response) {
      return response.objects;
    }
  });

  return ModelCollection;
});
