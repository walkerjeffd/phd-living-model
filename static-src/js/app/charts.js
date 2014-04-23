define([
  'd3',
], function (d3) {
  'use strict';

  var TimeseriesChart = function() {
    var svg,
        id = 0,
        margin = {top: 20, right: 20, bottom: 30, left: 50},
        width = 960,
        height = 500,
        xScale = d3.time.scale(),
        yScale = d3.scale.linear(),
        xAxis = d3.svg.axis().scale(xScale).orient("bottom"),
        yAxis = d3.svg.axis().ticks(5, "g").orient("left"),
        xValue = function(d) { return d[0]; },
        yValue = function(d) { return d[1]; },
        color,
        yLabel = "",
        line = d3.svg.line().x(X).y(Y),
        chartData = [],
        nestData,
        lines,
        yVariables = [],
        yVariableLabels = {},
        legend = true,
        xDomain,
        yDomain;

    var customTimeFormat = d3.time.format.multi([
      [".%L", function(d) { return d.getMilliseconds(); }],
      [":%S", function(d) { return d.getSeconds(); }],
      ["%I:%M", function(d) { return d.getMinutes(); }],
      ["%I %p", function(d) { return d.getHours(); }],
      ["%b %d", function(d) { return d.getDay() && d.getDate() != 1; }],
      ["%b %d", function(d) { return d.getDate() != 1; }],
      ["%b", function(d) { return d.getMonth(); }],
      ["%Y", function() { return true; }]
    ]);
    xAxis.tickFormat(customTimeFormat).ticks(5);

    function chart(selection) {
      selection.each(function() {

        yAxis.scale(yScale);

        if (typeof yVariables === 'string') {
          yVariables = [yVariables];
        }

        nestData = yVariables.map(function(name) {
          return {
            name: name,
            values: d3.zip(chartData.map(xValue),chartData.map(function(d) { return d[name]; }))
          };
        });

        if (!color) {
          color = d3.scale.category10().domain(yVariables);
        }

        xScale
          .range([0, width - margin.left - margin.right])
          .domain(xDomain || d3.extent(chartData, xValue));

        yScale
          .range([height - margin.top - margin.bottom, 0])
          .domain(yDomain || [
            d3.min([0, d3.min(nestData, function(d) { return d3.min(d.values, function(d) { return d[1]; }); })]),
            d3.max(nestData, function(d) { return d3.max(d.values, function(d) { return d[1]; }); })]);

        var currentYMax = yScale.domain()[1];
        var dataYMax = d3.max(nestData, function(d) { return d3.max(d.values, function(d) { return d[1]; }); });

        if (dataYMax > currentYMax) {
          yScale.domain([yScale.domain()[0], dataYMax]);
        }

        if (!svg) {
          svg = d3.select(this).append('svg');
          
          if (legend) {
            var gLegend = svg.append('g').attr('class', 'legend')
              .attr("transform", "translate(" + margin.left + ",0)");

            // add all legend items
            var gLegendItems = gLegend.selectAll('.legend-item').data(yVariables);

            gLegendItems.enter()
              .append('g')
              .attr('class', 'legend-item');

            gLegendItems.append('circle')
              .attr('r', 4)
              .attr('cx', 4)
              .attr('cy', 8)
              .attr('fill', function(d) { return color(d); });

            gLegendItems.append('text')
              .attr("y", "1em")
              .attr("x", 0)
              .attr("dy", 0)
              .attr("dx", 12)
              .style("text-anchor", "start")
              .text(function(d) { return yVariableLabels[d]; });

            // shift legend items by the width of their div
            var labelWidths = [];
            gLegendItems.each(function(d, i) { 
              labelWidths.push(d3.select(this)[0][0].getBBox().width);}
            );

            var labelOffsets = [0];
            for (var i = 1; i < (labelWidths.length); i++) {
              labelOffsets.push(labelOffsets[i-1] + labelWidths[i-1]);
            }

            gLegendItems.attr('transform', function(d, i) {
              if (i === 0) {
                return null;
              } else {
                return 'translate(' + (labelOffsets[i]+5*i) + ',0)';
              }
            });

          }

          var gEnter = svg.append('g')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
            
          gEnter.append('g').attr('class', 'x axis')
            .attr("transform", "translate(0," + yScale.range()[0] + ")");

          gEnter.append('g').attr('class', 'y axis')
            .append("text")
              .attr("y", 0)
              .attr("x", 5)
              .attr("dy", -5)
              .style("text-anchor", "start")
              .text(yLabel);

          gEnter.append('g').attr('class', 'lines')
            .attr("clip-path", "url(#clip-"+id+")");

          var clip = svg.append("defs").append("clipPath")
            .attr("id", "clip-"+id)
            .append("rect")
            .attr("id", "clip-rect")
            .attr("x", "0")
            .attr("y", "0")
            .attr("width", width - margin.left - margin.right)
            .attr("height", height - margin.top - margin.bottom);

          svg.append("rect")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")            
            .attr("width", width - margin.left - margin.right)
            .attr("height", height - margin.top - margin.bottom)
            .attr("class", "overlay");

        }

        svg.attr("width", width)
           .attr("height", height);

        draw();
      });
    }

    function draw() {
      svg.select('.x.axis')
          .call(xAxis);

      svg.select('.y.axis')
          .call(yAxis);

      lines = svg.select('g.lines').selectAll('.line')
            .data(nestData);
        
      lines.enter().append('path').attr('class', 'line');
      
      lines.attr("d", function(d) { return line(d.values); })
        .style("stroke", function(d) { return color(d.name); });

      lines.exit().remove();
    }

    function X(d) {
      return xScale(d[0]);
    }

    function Y(d) {
      return yScale(d[1]);
    }

    chart.id = function(_) {
      if (!arguments.length) return id;
      id = _;
      return chart;
    };

    chart.width = function(_) {
      if (!arguments.length) return width;
      width = _;
      return chart;
    };

    chart.height = function(_) {
      if (!arguments.length) return height;
      height = _;
      return chart;
    };

    chart.x = function(_) {
      if (!arguments.length) return xValue;
      xValue = _;
      return chart;
    };

    chart.y = function(_) {
      if (!arguments.length) return yValue;
      yValue = _;
      return chart;
    };

    chart.yLabel = function(_) {
      if (!arguments.length) return yLabel;
      yLabel = _;
      return chart;
    };

    chart.data = function(_) {
      if (!arguments.length) return chartData;
      chartData = _;
      return chart;
    };

    chart.onMouseout = function(_) {
      if (!arguments.length) return onMouseout;
      onMouseout = _;
      return chart;
    };

    chart.onMousemove = function(_) {
      if (!arguments.length) return onMousemove;
      onMousemove = _;
      return chart;
    };

    chart.legend = function(_) {
      if (!arguments.length) return legend;
      legend = _;
      return chart;
    };

    chart.yVariableLabels = function(_) {
      if (!arguments.length) return yVariableLabels;
      yVariableLabels = _;
      return chart;
    };

    chart.yVariables = function(_) {
      if (!arguments.length) return yVariables;
      yVariables = _;
      return chart;
    };

    chart.xDomain = function(_) {
      if (!arguments.length) return xDomain;
      xDomain = _;
      return chart;
    };

    chart.yDomain = function(_) {
      if (!arguments.length) return yDomain;
      yDomain = _;
      return chart;
    };

    chart.yScale = function(_) {
      if (!arguments.length) return yScale;
      yScale = _;
      return chart;
    };

    chart.yAxis = function(_) {
      if (!arguments.length) return yAxis;
      yAxis = _;
      return chart;
    };

    chart.color = function(_) {
      if (!arguments.length) return color;
      color = _;
      return chart;
    };

    return chart;
  };

  var BrushChart = function() {
    var svg,
        id = 0,
        margin = {top: 10, right: 20, bottom: 30, left: 50},
        width = 850,
        height = 200,
        xScale = d3.time.scale(),
        yScale = d3.scale.linear(),
        xAxis = d3.svg.axis().scale(xScale).orient("bottom"),
        yAxis = d3.svg.axis().ticks(5, "g").orient("left"),
        xValue = function(d) { return d[0]; },
        yValue = function(d) { return d[1]; },
        yLabel = '',
        data,
        color = 'black',
        onBrush,
        periodData = [],
        line = d3.svg.line(),
        period = d3.svg.line(),
        brush = d3.svg.brush();

    var customTimeFormat = d3.time.format.multi([
      [".%L", function(d) { return d.getMilliseconds(); }],
      [":%S", function(d) { return d.getSeconds(); }],
      ["%I:%M", function(d) { return d.getMinutes(); }],
      ["%I %p", function(d) { return d.getHours(); }],
      ["%b %d", function(d) { return d.getDay() && d.getDate() != 1; }],
      ["%b %d", function(d) { return d.getDate() != 1; }],
      ["%b", function(d) { return d.getMonth(); }],
      ["%Y", function() { return true; }]
    ]);

    xAxis.tickFormat(customTimeFormat).ticks(5);

    function chart(selection) {
      selection.each(function() {
        yAxis.scale(yScale);

        xScale
          .range([0, width - margin.left - margin.right])
          .domain(d3.extent(data, xValue));

        yScale
          .range([height - margin.top - margin.bottom, 0])
          .domain(d3.extent(data, yValue));

        brush.x(xScale).on('brush', brushed);

        if (!svg) {
          svg = d3.select(this).append('svg')
            .attr("width", width)
            .attr("height", height);

          var gPeriods = svg.append('g').attr('class', 'periods')
            .attr("transform", "translate(" + margin.left + ",0)");

          var gEnter = svg.append('g')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
            
          gEnter.append('g').attr('class', 'x axis')
            .attr("transform", "translate(0," + yScale.range()[0] + ")");

          gEnter.append('g').attr('class', 'y axis')
            .append("text")
              .attr("y", 0)
              .attr("x", 5)
              .attr("dy", -5)
              .style("text-anchor", "start")
              .text(yLabel);

          gEnter.append('g').attr('class', 'lines')
            .attr("clip-path", "url(#clip-"+id+")");

          var clip = svg.append("defs").append("clipPath")
            .attr("id", "clip-"+id)
            .append("rect")
            .attr("id", "clip-rect")
            .attr("x", "0")
            .attr("y", "0")
            .attr("width", width - margin.left - margin.right)
            .attr("height", height - margin.top - margin.bottom);

          gEnter.append('g').attr('class', 'x brush')
            .call(brush)
            .selectAll("rect")
            .attr("height", height - margin.top - margin.bottom);
        }

        line.x(function(d) { return xScale(xValue(d)); })
          .y(function(d) { return yScale(yValue(d)); });

        period.x(function(d) { return xScale(d); })
          .y(function(d, i) { return 0; });

        svg.select('.x.axis')
            .call(xAxis);

        svg.select('.y.axis')
            .call(yAxis);

        var periods = svg.select('g.periods').selectAll('.period')
          .data(periodData, function(d) { return d.key; });

        periods.enter()
          .append('path').attr('class', 'period line')
          .on('click', function(d) { console.log('CLICKED');setBrush(d.extent); })
          .append('title').text(function(d) { return d.label; });

        periods
          .attr('d', function(d) { return period(d.extent); })
          .style('stroke', function(d) { return d.color; })
          .attr("transform", function(d, i) { return "translate(0," + (margin.top-6*i-2) + ")"; });

        periods.exit().remove();

        var lines = svg.select('g.lines').selectAll('.line')
              .data([data]);

        lines.enter().append('path').attr('class', 'line').style('stroke', color);
        
        lines.attr("d", line);

        lines.exit().remove();
      });
    }

    function brushed() {
      onBrush(brush.extent().map(d3.time.day.floor));
    }

    function X(d) {
      return xScale(d[0]);
    }

    function Y(d) {
      return yScale(d[1]);
    }

    function setBrush(values) {
      console.log('setting brush to ', values);
      // brush.extent(values);
      svg.select(".brush").call(brush.extent(values));
      brushed();
    }

    chart.color = function(_) {
      if (!arguments.length) return color;
      color = _;
      return chart;
    };

    chart.id = function(_) {
      if (!arguments.length) return id;
      id = _;
      return chart;
    };

    chart.width = function(_) {
      if (!arguments.length) return width;
      width = _;
      return chart;
    };

    chart.height = function(_) {
      if (!arguments.length) return height;
      height = _;
      return chart;
    };

    chart.x = function(_) {
      if (!arguments.length) return xValue;
      xValue = _;
      return chart;
    };

    chart.y = function(_) {
      if (!arguments.length) return yValue;
      yValue = _;
      return chart;
    };

    chart.yLabel = function(_) {
      if (!arguments.length) return yLabel;
      yLabel = _;
      return chart;
    };

    chart.onBrush = function(_) {
      if (!arguments.length) return onBrush;
      onBrush = _;
      return chart;
    };

    chart.data = function(_) {
      if (!arguments.length) return data;
      data = _;
      return chart;
    };

    chart.periodData = function(_) {
      if (!arguments.length) return periodData;
      periodData = _;
      return chart;
    };

    chart.yScale = function(_) {
      if (!arguments.length) return yScale;
      return chart;
    };

    chart.yAxis = function(_) {
      if (!arguments.length) return yAxis;
      yAxis = _;
      return chart;
    };

    return chart;
  };

  var ScatterChart = function() {
    var margin = {top: 20, right: 20, bottom: 40, left: 50},
        width = 960,
        height = 500,
        xScale = d3.scale.linear(),
        yScale = d3.scale.linear(),
        xAxis = d3.svg.axis(),
        yAxis = d3.svg.axis(),
        xValue = function(d) { return d[0]; },
        yValue = function(d) { return d[1]; },
        xLabel = "",
        yLabel = "",
        xDomain,
        yDomain,
        chartData = [],
        rSize,
        opacity = 1,
        one2one = false,
        line = d3.svg.line(),
        abline,
        extent;

    function chart(selection) {
      selection.each(function() {

        var currX = d3.extent(chartData, function(d) { return xValue(d); });
        var currY = d3.extent(chartData, function(d) { return yValue(d); });
        var currExtent = [d3.min([currX[0], currY[0]]), d3.max([currX[1], currY[1]])];
        if (!extent) {
          extent = [];        
          extent[0] = currExtent[0]*0.9;
          extent[1] = currExtent[1]*1.1;
        } else {
          if (currExtent[0] < extent[0]) {
            extent[0] = currExtent[0]*0.9;
          }
          if (currExtent[1] > extent[1]) {
            extent[1] = currExtent[1]*1.1;
          }
        }

        xScale
          .range([0, width - margin.left - margin.right])
          // .domain(xDomain || d3.extent(chartData, function(d) { return xValue(d); }));
          .domain(extent);

        yScale
          .range([height - margin.top - margin.bottom, 0])
          // .domain(yDomain || d3.extent(chartData, function(d) { return yValue(d); }));
          .domain(extent);

        line
          .x(function(d) { return xScale(d[0]); })
          .y(function(d) { return yScale(d[1]); });

        xAxis.scale(xScale).ticks(5, "g").orient("bottom");
        yAxis.scale(yScale).ticks(5, "g").orient("left");

        var svg = d3.select(this).selectAll('svg').data([chartData]);

        var gEnter = svg.enter().append('svg').append('g');

        gEnter.append('path').attr('class', 'line one2one')
          .style('stroke', 'black')
          .style('stroke-dasharray', '5,5');
        gEnter.append('path').attr('class', 'line abline')
          .style('stroke', 'blue');
        gEnter.append('g').attr('class', 'x axis')
          .append("text")
            .attr("y", 0)
            .attr("x", width - margin.left - margin.right)
            .attr("dy", "2.9em")
            .style("text-anchor", "end")
            .text(xLabel);
        gEnter.append('g').attr('class', 'y axis')
          .append("text")
            .attr("y", 0)
            .attr("x", 0)
            .attr("dy", 15)
            .attr("transform", "rotate(-90)")
            .style("text-anchor", "end")
            .text(yLabel); 
        gEnter.append('g').attr('class', 'circles');

        svg.attr("width", width)
           .attr("height", height);

        var g = svg.select('g')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        g.select('.x.axis').attr("transform", "translate(0," + yScale.range()[0] + ")")
            .call(xAxis);

        g.select('.y.axis')
            .call(yAxis);

        var circles = g.select('.circles').selectAll('.circle')
          .data(chartData, function(d) { return d.Date; });
        
        circles.enter()
          .append('circle')
          .attr('class', 'circle')
          .attr("r", rSize);

        circles
          .attr("cx", X)
          .attr("cy", Y)
          .attr("opacity", opacity);

        circles.exit().remove();

        if (one2one) {
          g.select('.line.one2one')
              .attr("d", line([[xScale.domain()[0], yScale.domain()[0]], 
                               [xScale.domain()[1], yScale.domain()[1]]]));
        } else {
          g.select('.line.one2one').remove();
        }
        if (abline) {
          g.select('.line.abline')
              .attr("d", line([[xScale.domain()[0], Math.exp(abline[0])*Math.pow(xScale.domain()[0], abline[1])],
                               [xScale.domain()[1], Math.exp(abline[0])*Math.pow(xScale.domain()[1], abline[1])]]));
        } else {
          g.select('.line.abline').attr("d", line([[xScale.domain()[0], xScale.domain()[0]],[xScale.domain()[0], xScale.domain()[0]]]));
        }
      });
    }

    function X(d) {
      return xScale(xValue(d));
    }

    function Y(d) {
      return yScale(yValue(d));
    }

    chart.width = function(_) {
      if (!arguments.length) return width;
      width = _;
      return chart;
    };

    chart.height = function(_) {
      if (!arguments.length) return height;
      height = _;
      return chart;
    };

    chart.x = function(_) {
      if (!arguments.length) return xValue;
      xValue = _;
      return chart;
    };

    chart.y = function(_) {
      if (!arguments.length) return yValue;
      yValue = _;
      return chart;
    };

    chart.xScale = function(_) {
      if (!arguments.length) return xScale;
      xScale = _;
      return chart;
    };

    chart.yScale = function(_) {
      if (!arguments.length) return yScale;
      yScale = _;
      return chart;
    };

    chart.xLabel = function(_) {
      if (!arguments.length) return xLabel;
      xLabel = _;
      return chart;
    };

    chart.yLabel = function(_) {
      if (!arguments.length) return yLabel;
      yLabel = _;
      return chart;
    };

    chart.xDomain = function(_) {
      if (!arguments.length) return xDomain;
      xDomain = _;
      return chart;
    };

    chart.yDomain = function(_) {
      if (!arguments.length) return yDomain;
      yDomain = _;
      return chart;
    };

    chart.data = function(_) {
      if (!arguments.length) return chartData;
      chartData = _;
      return chart;
    };

    chart.r = function(_) {
      if (!arguments.length) return rSize;
      rSize = _;
      return chart;
    };

    chart.opacity = function(_) {
      if (!arguments.length) return opacity;
      opacity = _;
      return chart;
    };

    chart.one2one = function(_) {
      if (!arguments.length) return one2one;
      one2one = _;
      return chart;
    };

    chart.abline = function(_) {
      if (!arguments.length) return abline;
      abline = _;
      return chart;
    };

    return chart;
  };


  return {
    TimeseriesChart: TimeseriesChart,
    BrushChart: BrushChart,
    ScatterChart: ScatterChart
  };
});

