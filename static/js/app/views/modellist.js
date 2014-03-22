define([
  'jquery',
  'underscore',
  'backbone',
  'app/views/modellistitem'
], function ($, _, Backbone, ModelListItemView) {
  'use strict';

  var ModelListView = Backbone.View.extend({
    initialize: function () {
      console.log('ModelListView: initialize');

      this.listenTo(this.collection, 'sync', this.render);
      this.render();
    },

    render: function() {
      console.log('ModelListView: rendering list');
      this.$el.html('<h1>Models</h1><ul></ul>');
      this.collection.each(this.renderModel, this);
      return this;
    },

    renderModel: function(model) {
      console.log('ModelListView: rendering model');
      this.$('ul').append(new ModelListItemView({
        tagName: 'li',
        model: model
      }).el);
    }

  });

  return ModelListView;
});