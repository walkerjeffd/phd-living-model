define([
  'jquery',
  'underscore',
  'backbone'
], function ($, _, Backbone) {
  'use strict';

  var ModelListItemView = Backbone.View.extend({
    template: _.template('<a href="/models#<%= id %>"><%= name %></a>'),

    initialize: function () {
      console.log('ModelListItemView: initialize');
      this.listenTo(this.model, 'change', this.render);
      this.render();
    },

    render: function() {
      console.log('ModelListItemView: rendering');
      this.$el.html(this.template(this.model.attributes));
      return this;
    }
  });

  return ModelListItemView;
});