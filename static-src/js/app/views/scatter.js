define([
  'jquery',
  'underscore',
  'backbone',
  'd3',
  'app/charts'
], function ($, _, Backbone, d3, Charts) {
  'use strict';

  var ScatterView = Backbone.View.extend({
    initialize: function (options) {
      console.log('ScatterView: initialize');
      this.simModel = options.simModel;
      var view = this;

      this.extent = null;

      this.listenTo(this.model, 'setExtent', this.setExtent);

      this.chart = new Charts.ScatterChart()
        .x(function(d) { return d.obsQ; })
        .y(function(d) { return d.Q; })
        .width(275)
        .height(295)
        .r(2)
        .opacity(0.5)
        .yDomain([0.001, 2])
        .xDomain([0.001, 2])
        .xScale(d3.scale.log())
        .yScale(d3.scale.log())
        .one2one(true)
        .yLabel('Sim Flow (in/d)')
        .xLabel('Obs Flow (in/d)');
    },

    setExtent: function(extent) {
      this.extent = extent;
      this.render();
    },

    render: function () {
      // console.log('ScatterView: render');
      var extent = this.extent;

      if (extent) {
        var outputFiltered = _.filter(this.simModel.output, function(d) {
          return d.Date >= extent[0] && d.Date <= extent[1];
        });
        d3.select(this.$el.children('.chart')[0]).call(this.chart.data(outputFiltered));
      } else {
        d3.select(this.$el.children('.chart')[0]).call(this.chart.data(this.simModel.output));
      }

    }
  });

  return ScatterView;
});



      
