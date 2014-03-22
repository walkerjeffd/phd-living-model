define([
  'jquery',
  'underscore',
  'backbone',
  'app/charts'
], function ($, _, Backbone) {
  'use strict';

  var ParametersView = Backbone.View.extend({
    template: _.template($('#template-parameters').html()),

    initialize: function () {
      console.log('ParametersView: initialize');
      this.render();
      var view = this;
      
      this.$(".slider").change(function() {
        view.$("#"+this.name).text(this.value);
        view.model.set(this.name, +this.value);
        view.model.trigger('changeParam');
      });
      
      this.listenTo(this.model, 'sync', this.updateSliders);
    },

    updateSliders: function() {
      var view = this;
      this.$('.slider').each(function(slider) {
        this.value = +view.model.get(this.name);
        view.$("#"+this.name).text(this.value);
      });
    },

    render: function () {
      console.log('ParametersView: render');
      this.$el.html(this.template());
      return this;
    }
  });

  return ParametersView;
});