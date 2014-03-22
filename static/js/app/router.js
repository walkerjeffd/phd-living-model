define([
  'jquery',
  'bootstrap',
  'app/collections/model',
  'app/views/app',
  'app/views/modellist',
  'app/views/model',
  'app/models/model'
], function ($, Bootstrap, ModelCollection, AppView, ModelListView, ModelView, ModelModel) {
  'use strict';

  var Router = Backbone.Router.extend({
    routes: {
      '': 'modelList',
      ':id': 'modelDetail'
    },

    setup: function() {
      console.log('Router: set up');
      if (!this.appView) {
        this.collection = new ModelCollection();
        this.appView = new AppView({});
        this.collection.fetch();
      }
    },

    modelList: function() {
      console.log('Router: model list');
      this.setup();
      new ModelListView({collection: this.collection, el: '#main'});
    },

    modelDetail: function(id) {
      console.log('Router: model item');
      // this.setup();
      new ModelView({model: new ModelModel({id: id}), el: '#main'});
    }
  });

  return Router;
});
    