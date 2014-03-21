define([
  'jquery',
  'underscore',
  'backbone',
  'd3',
  'app/charts',
  'app/utils'
], function ($, _, Backbone, d3, Charts, Utils) {
  'use strict';

  var InfoView = Backbone.View.extend({
    template: _.template($('#template-info').html()),

    events: {
      'click #btn-save': 'saveModel',
      'click #btn-reset': 'resetModel',
      'click #btn-dl-input': 'downloadInput',
      'click #btn-dl-output': 'downloadOutput'
    },

    initialize: function (options) {
      console.log('InfoView: initialize');
      this.simModel = options.simModel;
      this.listenTo(this.model, 'sync', this.render);
    },

    downloadInput: function() {
      if (this.model.input && this.model.input.length > 0) {
        var dateFormat = d3.time.format('%Y-%m-%d');
        var inputObj = this.model.input.map(function(d) {
          return {
            Date: dateFormat(d.Date),
            Tmin_degC: d.Tmin_degC,
            Tmax_degC: d.Tmax_degC,
            Precip_in: d.Precip_in,
            Flow_in: d.Flow_in,
          };
        });
        Utils.saveToCSVFile(inputObj, 'input.csv');
      }
    },

    downloadOutput: function() {
      if (this.simModel && this.simModel.output && this.simModel.output.length > 0) {
        var dateFormat = d3.time.format('%Y-%m-%d');
        var outputObj = this.simModel.output.map(function(d) {
          return {
            Date: dateFormat(d.Date),
            Tmin_degC: d.Tmin,
            Tmax_degC: d.Tmax,
            Precip_in: d.P,
            Obs_Flow_in: d.obsQ,
            Tavg_degC: d.Tavg,
            Trng_degC: d.Trng,
            JulianDay: d.Jday,
            Solar_in: d.SR,
            PET_in: d.PET,
            AvailableWater_in: d.W,
            ETOpportunity_in: d.Y,
            SoilMoisture_in: d.S,
            ET_in: d.ET,
            Runoff_in: d.DR,
            GWRecharge_in: d.GR,
            Groundwater_in: d.G,
            GWDischarge_in: d.GD,
            Flow_in: d.Q,
          };
        });
        Utils.saveToCSVFile(outputObj, 'output.csv');
      }
    },

    saveModel: function() {
      var datetimeFormat = d3.time.format('%Y-%m-%dT%H:%M:%S');      

      var porStart = datetimeFormat(this.model.input[0].Date),
          porEnd = datetimeFormat(this.model.input[this.model.input.length-1].Date);

      var calStart, calEnd;

      if (this.model.extent) {
        calStart = this.model.extent[0] + "T00:00:00";
        calEnd = this.model.extent[1] + "T00:00:00";
      } else {
        calStart = porStart;
        calEnd = porEnd;
      }

      this.model.set('cal_start', calStart);
      this.model.set('cal_end', calEnd);

      this.model.set('por_start', porStart);
      this.model.set('por_end', porEnd);

      this.model.set('updated', datetimeFormat(new Date()));

      this.model.save();
    },

    resetModel: function() {
      this.model.fetch({
        success: function(model, response, options) {
          this.model.trigger('changeParam');
        }.bind(this)
      });
    },

    render: function () {
      console.log('InfoView: render');
      this.$el.html(this.template(this.model.attributes));
      return this;
    }
  });

  return InfoView;
});