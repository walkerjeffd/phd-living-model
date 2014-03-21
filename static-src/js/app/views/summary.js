define([
  'jquery',
  'underscore',
  'backbone',
  'd3',
  'app/charts',
  'app/utils'
], function ($, _, Backbone, d3, Charts, Utils) {
  'use strict';

  var SummaryView = Backbone.View.extend({
    template: _.template($('#template-summary').html()),

    initialize: function (options) {
      console.log('SummaryView: initialize');
      this.simModel = options.simModel;
      
      this.dateFormat = d3.time.format('%Y-%m-%d');
      this.statFormat = d3.format('4.4f');
      this.percentFormat = d3.format('.2p');

      this.listenTo(this.model, 'updateInput', this.renderTable);
      this.listenTo(this.model, 'setExtent', this.renderTable);
      this.listenTo(this.model, 'change:cal_start', this.renderTable);
      this.listenTo(this.model, 'change:cal_end', this.renderTable);
      this.listenTo(this.model, 'recompute', this.renderTable);
      
      this.render();
    },

    renderExtent: function(extent) {
    },

    renderTable: function() {
      var dateParseExtent = d3.time.format('%Y-%m-%d'),
          dateParse = d3.time.format('%Y-%m-%dT%H:%M:%S');


      var extent = this.model.extent;

      if (this.model.get('cal_start') && this.model.get('cal_end')) {
        var start = dateParse.parse(this.model.get('cal_start')),
            end = dateParse.parse(this.model.get('cal_end'));
            
        var outputCalib = _.filter(this.simModel.output, function(d) {
          return d.Date >= start && d.Date <= end;
        });
        var statsCalib = Utils.statsGOF(outputCalib, 'obsQ', 'Q');

        this.$('#calib-start').text(this.dateFormat(start));
        this.$('#calib-end').text(this.dateFormat(end));
        this.$('#calib-count').text(Math.round((end-start)/86400000)+1);
        this.$('#calib-rmse').text(this.statFormat(statsCalib.rmse));
        this.$('#calib-bias').text(this.percentFormat(statsCalib.perBias));
      }

      if (extent) {
        extent = extent.map(dateParseExtent.parse);

        var outputExtent = _.filter(this.simModel.output, function(d) {
          return d.Date >= extent[0] && d.Date <= extent[1];
        });
        var statsExtent = Utils.statsGOF(outputExtent, 'obsQ', 'Q');

        this.$('#extent-start').text(this.dateFormat(extent[0]));
        this.$('#extent-end').text(this.dateFormat(extent[1]));
        this.$('#extent-count').text(Math.round((extent[1]-extent[0])/86400000)+1);
        this.$('#extent-rmse').text(this.statFormat(statsExtent.rmse));
        this.$('#extent-bias').text(this.percentFormat(statsExtent.perBias));
      } else {
        this.$('#extent-start').text('');
        this.$('#extent-end').text('');
        this.$('#extent-count').text('');
        this.$('#extent-rmse').text('');
        this.$('#extent-bias').text('');
      }
      
      // Period of Record
      if (this.model.input && this.model.input.length > 0) {
        var statsPOR = Utils.statsGOF(this.simModel.output, 'obsQ', 'Q');
        this.$('#dataset-start').text(this.dateFormat(this.model.input[0].Date));
        this.$('#dataset-end').text(this.dateFormat(this.model.input[this.model.input.length-1].Date));
        this.$('#dataset-count').text(this.model.input.length);
        this.$('#dataset-rmse').text(this.statFormat(statsPOR.rmse));
        this.$('#dataset-bias').text(this.percentFormat(statsPOR.perBias));
      }
      
    },

    render: function () {
      console.log('SummaryView: render');
      this.$el.html(this.template());
      return this;
    }
  });

  return SummaryView;
});



      
