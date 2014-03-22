define([
  'jquery',
  'underscore',
  'backbone',
  'd3',
  'app/charts'
], function ($, _, Backbone, d3, Charts) {
  'use strict';

  var TimeseriesView = Backbone.View.extend({
    initialize: function (options) {
      console.log('TimeseriesView: initialize');
      this.simModel = options.simModel;
      var view = this;

      this.listenTo(this.model, 'setExtent', this.setExtent);

      this.chart = new Charts.TimeseriesChart()
        .id(this.cid)
        .x(function(d) { return d.Date; })
        .width(650)
        .height(200)
        .yDomain([0.001, 2])
        .yScale(d3.scale.log())
        .yVariables(['obsQ', 'Q'])
        .yVariableLabels({'obsQ': 'Observed Flow (in/day)', 'Q': 'Simulated Flow (in/day)'})
        .yLabel('')
        .color(d3.scale.ordinal().domain(['obsQ', 'Q']).range(['black', 'crimson']));
    },

    setExtent: function(extent) {
      this.chart.xDomain(extent);
      this.render();
    },

    render: function () {
      // console.log('TimeseriesView: render');
      d3.select(this.$el.children('.chart')[0]).call(this.chart.data(this.simModel.output));
    }
  });

  return TimeseriesView;
});