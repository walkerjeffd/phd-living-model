define([
  'jquery',
  'underscore',
  'd3'
], function ($, _, d3) {
  'use strict';

  var sum = function(x) {
    var n = x.length;
    if (n === 0) return NaN;
    var m = 0,
    i = -1;
    while (++i < n) m += x[i];
    return m;
  };

  var mean = function(x) {
    // science.js
    var n = x.length;
    if (n === 0) return NaN;
    var m = 0,
    i = -1;
    while (++i < n) m += (x[i] - m) / (i + 1);
    return m;
  };

  var variance = function(x) {
    // science.js
    var n = x.length;
    if (n < 1) return NaN;
    if (n === 1) return 0;
    var m = mean(x),
    i = -1,
    s = 0;
    while (++i < n) {
      var v = x[i] - m;
      s += v * v;
    }
    return s / n;
  };

  var statsGOF = function(data, obs, sim) {
    var log10 = function(x) {
      return Math.log(x)*Math.LOG10E;
    };

    var log_resid2 = data.map(function(d) {
      return Math.pow(log10(d[obs]) - log10(d[sim]), 2);
    });

    var log_obs = _.pluck(data, obs).map(function(d) {
      return log10(d);
    });

    var mse = mean(log_resid2);

    var meanObs = mean(_.pluck(data, obs).map(log10)),
        meanSim = mean(_.pluck(data, sim).map(log10));

    var perBias = (meanObs-meanSim)/meanObs;

    return {
      rmse: Math.sqrt(mse),
      nse: 1 - mse / variance(log_obs),
      perBias: perBias
    };
  };

  var convertObjectToCsv = function(array, header) {
    // console.log(typeof objArray);
    // var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
    header = header === undefined ? true : header;
    var str = '',
    line = '',
    index;

    if (header) {
      line = '';
      for (index in array[0]) {
        if (line !== '') line += ',';
        line += index;
      }
      str += line + '\r\n';
    }

    for (var i = 0; i < array.length; i++) {
      line = '';
      for (index in array[i]) {
        if (line !== '') line += ',';

        line += array[i][index];
      }

      str += line + '\r\n';
    }

    return str;
  };

  var saveToCSVFile = function(obj, filename) {
    var csvString = convertObjectToCsv(obj, true);
    saveToFile(csvString, filename, 'text/csv');
  };

  var saveToJSONFile = function(obj, filename) {
    var jsonString = JSON.stringify(obj);
    saveToFile(jsonString, filename, 'application/json');
  };

  var saveToFile = function(obj, filename, mimeType) {      
    mimeType = mimeType || 'text/plain';

    var bb = new Blob([obj], {type: 'text/plain'});

    if (window.navigator.msSaveBlob) {
      window.navigator.msSaveBlob(bb, filename);
    } else {
      var a = $('<a></a>')
        .attr('href', window.URL.createObjectURL(bb))
        .attr('download', filename);
      $('body').append(a);
      a[0].click();  
    }
  };

  return {
    sum: sum,
    mean: mean,
    variance: variance,
    statsGOF: statsGOF,
    saveToFile: saveToFile,
    saveToCSVFile: saveToCSVFile,
    saveToJSONFile: saveToJSONFile
  };
});