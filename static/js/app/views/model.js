define([
  'jquery',
  'underscore',
  'backbone',
  'd3',
  'app/charts',
  'app/sim',
  'app/views/info',
  'app/views/parameters',
  'app/views/brush',
  'app/views/timeseries',
  'app/views/scatter',
  'app/views/summary'
], function ($, _, Backbone, d3, Charts, SimModel, InfoView, ParametersView, BrushView, TimeseriesView, ScatterView, SummaryView) {
  'use strict';

  var ModelView = Backbone.View.extend({
    template: _.template($('#template-model').html()),

    initialize: function () {
      console.log('ModelView: initialize');
      this.render();

      window.APP = this;

      this.model.fetch({
        success: function(model, response, options) {
          model.trigger('fetchInput');
        },
        error: function(model, response, options) {
          console.log('ERROR:', response);
          this.showError('Failed to load model.', response.statusText, response.status);
          
        }.bind(this)
      });

      this.simModel = new SimModel();
      this.extent = null;

      this.listenTo(this.model, 'updateInput', this.updateInput);
      this.listenTo(this.model, 'changeParam', this.recompute);
      this.listenTo(this.model, 'setExtent', this.setExtent);
      this.listenTo(this.model, 'fetchInput', this.fetchInput);
      this.listenTo(this.model, 'showError', this.showError);
      // this.listenTo(this.model, 'all', function(e, model) { console.log('Model Event: ', e);});
      
      this.infoView = new InfoView({model: this.model, simModel: this.simModel, el: this.$('#model-info')});
      this.paramsView = new ParametersView({model: this.model, el: this.$('#params')});
      this.brushView = new BrushView({model: this.model, simModel: this.simModel, el: this.$('#chart-brush')});
      this.tsView = new TimeseriesView({model: this.model, simModel: this.simModel, el: this.$('#chart-ts')});
      this.scatterView = new ScatterView({model: this.model, simModel: this.simModel, el: this.$('#chart-scatter')});
      this.summaryView = new SummaryView({model: this.model, simModel: this.simModel, el: this.$('#summary')});
    },

    showError: function(message, statusText, statusCode) {
      this.$el.html('<h1>Error</h1><p>'+message+'</p><p>Status Code: '+statusText+' ('+statusCode+')</p>');
    },

    fetchInput: function () {
      var dateFormat = d3.time.format('%Y-%m-%d');
      d3.csv(this.model.get('input_url'))
        .row(function(d) {
          return {
            Date: dateFormat.parse(d.Date),
            Precip_in: +d.Precip_in,
            Tmin_degC: +d.Tmin_degC,
            Tmax_degC: +d.Tmax_degC,
            Flow_in: +d.Flow_in
          };
        })
        .get(function(error, data) {
          if (error) {
            this.model.trigger('showError', 'Failed to load input dataset. Server responded with: ' + error.response, error.statusText, error.status);
          }
          this.$('#loading-row').hide();
          this.$('.model-row').show();
          this.model.input = data;
          this.model.trigger('updateInput');
        }.bind(this));
    },

    recompute: function() {
      this.simModel.run(this.model);
      this.model.trigger('recompute');
      this.brushView.render();
      this.tsView.render();
      this.scatterView.render();
    },

    setExtent: function(extent) {
      var format = d3.time.format("%Y-%m-%d");
      if (extent) {
        extent = extent.map(format);
      }
      this.model.extent = extent;
    },

    updateInput: function () {
      this.simModel.setInput(this.model.input, this.model.get('watershed').latitude);
      this.recompute();
    },

    render: function () {
      console.log('ModelView: render');
      this.$el.html(this.template());
    }
  });

  return ModelView;
});