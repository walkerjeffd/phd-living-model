define([
  'jquery',
  'underscore',
  'backbone',
  'd3',
  'app/charts'
], function ($, _, Backbone, d3, Charts) {
  'use strict';

  var BrushView = Backbone.View.extend({
    initialize: function (options) {
      console.log('BrushView: initialize');
      this.simModel = options.simModel;
      var view = this;

      this.listenTo(this.model, 'change:cal_start', this.updatePeriods);
      this.listenTo(this.model, 'change:cal_end', this.updatePeriods);
      this.listenTo(this.model, 'change:last_start', this.updatePeriods);
      this.listenTo(this.model, 'change:last_end', this.updatePeriods);
      this.listenTo(this.model, 'updateInput', this.updatePeriods);

      this.chart = new Charts.BrushChart()
        .id(this.cid)
        .width(650)
        .height(100)
        .x(function(d) { return d.Date; })
        .y(function(d) { return d.obsQ; })
        .onBrush(view.changeBrush.bind(this));
    },

    updatePeriods: function() {
      var dateFormat = d3.time.format('%Y-%m-%dT%H:%M:%S');
      var periods = [];
      if (this.model.get('cal_start') && this.model.get('cal_end')) {
        periods.push({
          key: 'calibration',
          label: 'Calibration Period',
          color: 'orangered',
          extent: [dateFormat.parse(this.model.get('cal_start')), dateFormat.parse(this.model.get('cal_end'))]
        });
      }
      if (this.model.get('last_start') && this.model.get('last_end') && this.model.input) {
        var porEnd = dateFormat.parse(this.model.get('last_end')),
            inpEnd = this.model.input[this.model.input.length-1].Date;
        if (inpEnd > porEnd) {
          periods.push({
          key: 'updated',
          label: 'Updated Period since Last Save',
          color: 'steelblue',
          extent: [porEnd, inpEnd]
        });
        }
      }
      if (periods.length > 0) {
        this.chart.periodData(periods);
      }
      this.render();
    },

    changeBrush: function(extent) {
      if (extent[1] <= extent[0]) {
        // extent = d3.extent(this.simModel.output, function(d) { return d.Date; });
        extent = null;
      }
      this.model.trigger('setExtent', extent);
    },

    render: function () {
      // console.log('BrushView: render');
      if (this.simModel.output && this.simModel.output.length > 0) {
        d3.select(this.$el.children('.chart')[0]).call(this.chart.data(this.simModel.output));
      }
    }
  });

  return BrushView;
});