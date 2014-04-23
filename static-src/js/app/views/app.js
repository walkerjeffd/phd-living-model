define([
  'jquery',
  'underscore',
  'backbone',
  'app/views/modellist'
], function ($, _, Backbone, ModelListView) {
  'use strict';

  var AppView = Backbone.View.extend({
    template: _.template(''),

    initialize: function () {
      console.log('AppView: initialize');
      this.render();
    },

    render: function () {
      this.$el.append(this.template());
    }
  });

  return AppView;
});