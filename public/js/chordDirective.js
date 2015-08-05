app.directive('chordDiagram', ['$window', 'matrixFactory',

  function($window, matrixFactory) {

    var link = function($scope, $el, $attr) {

      var size = [750, 750]; // SVG SIZE WIDTH, HEIGHT
      var marg = [50, 50, 50, 50]; // TOP, RIGHT, BOTTOM, LEFT
      var dims = []; // USABLE DIMENSIONS
      dims[0] = size[0] - marg[1] - marg[3]; // WIDTH
      dims[1] = size[1] - marg[0] - marg[2]; // HEIGHT

      var colors = d3.scale.ordinal().range(["peru", "BlueViolet", "DodgerBlue",
        "mediumspringgreen", "tomato", "firebrick"
      ]);
      var chord = d3.layout.chord()
        .padding(0.01)
        .sortGroups(d3.descending)
        .sortSubgroups(d3.ascending);

      var matrix = matrixFactory.chordMatrix()
        .layout(chord)
        .filter(function(item, r, c) {
          return (item.source === r.name && item.target === c.name) ||
            (item.source === c.name && item.target === r.name);
        })
        .reduce(function(items, r, c) {
          var value;
          if (!items[0]) {
            value = 0;
          } else {
            value = items.reduce(function(m, n) {
              if (r === c) {
                return m + (n.flow1 + n.flow2);
              } else {
                return m + (n.source === r.name ? n.flow1 : n.flow2);
              }
            }, 0);
          }
          return {
            value: value,
            data: items
          };
        });

      var innerRadius = (dims[1] / 2) - 100;

      var arc = d3.svg.arc()
        .innerRadius(innerRadius)
        .outerRadius(innerRadius + 20);

      var path = d3.svg.chord()
        .radius(innerRadius);

      var svg = d3.select($el[0]).append("svg")
        .attr("class", "chart")
        .attr({
          width: size[0] + "px",
          height: size[1] + "px"
        })
        .attr("preserveAspectRatio", "xMinYMin")
        .attr("viewBox", "0 0 " + size[0] + " " + size[1]);

      var container = svg.append("g")
        .attr("class", "container")
        .attr("transform", "translate(" + ((dims[0] / 2) + marg[3]) + "," + ((dims[1] / 2) + marg[0]) + ")");

      var messages = svg.append("text")
        .attr("class", "messages")
        .attr("transform", "translate(10, 10)")
        .text("Updating...");

      $scope.drawChords = function(data, pagerank) {

        messages.attr("opacity", 1);
        messages.transition().duration(1000).attr("opacity", 0);

        matrix.data(data)
          .resetKeys()
          .addKeys(['source', 'target'])
          .update()

        var groups = container.selectAll("g.group")
          .data(matrix.groups(), function(d) {
            return d._id;
          });

        var gEnter = groups.enter()
          .append("g")
          .attr("class", "group");

        gEnter.append("path")
          .style("pointer-events", "none")
          .style("fill", function(d) {
            return colors(d._id);
          })
          .attr("d", arc);

        gEnter.append("text")
          .attr("dy", ".35em")
          .on("click", groupClick)
          .on("mouseover", dimChords)
          .on("mouseout", resetChords)
          .attr("fill", "ghostwhite")
          .text(function(d) {
            return d._id;
          });

        groups.select("path")
          .transition().duration(2000)
          .attrTween("d", matrix.groupTween(arc));

        groups.select("text")
          .transition()
          .duration(2000)
          .attr("transform", function(d) {
            d.angle = (d.startAngle + d.endAngle) / 2;
            var r = "rotate(" + (d.angle * 180 / Math.PI - 90) + ")";
            var t = " translate(" + (innerRadius + 3) + ")";
            return r + t + (d.angle > Math.PI ? " rotate(180)" : " rotate(0)");
          })
          .attr("text-anchor", function(d) {
            return d.angle > Math.PI ? "end" : "begin";
          })
          .attr("fill", "ghostwhite");

        groups.exit().select("text").attr("fill", "orange");
        groups.exit().select("path").remove();

        groups.exit().transition().duration(1000)
          .style("opacity", 0).remove();

        var chords = container.selectAll("path.chord")
          .data(matrix.chords(), function(d) {
            return d._id;
          });

        chords.enter().append("path")
          .attr("class", "chord")
          .style("fill", function(d) {
            return colors(d.source._id);
          })
          .attr("d", path)
          .on("mouseover", chordMouseover)
          .on("mouseout", hideTooltip);

        chords.transition().duration(2000)
          .attrTween("d", matrix.chordTween(path));

        chords.exit().remove();

        var keys = pagerank.map(function(d, i) {
          return d.name;
        });
        var numBars = keys.length;

        var angles = [];
        groups[0].forEach(function(d, i) {
          angles.push(d.__data__.angle);
        });

        var extent = d3.extent(pagerank, function(d) {
          return d.value;
        });
        var barScale = d3.scale.linear()
          .domain(extent)
          .range([0, 100]);

        var innerR = innerRadius + 20;
        var outerR = innerR + 80;

        var arr = pagerank.map(function(d) { return d.value})
        var min = Math.log(Math.min.apply(null, arr));
        var max = Math.log(Math.max.apply(null, arr));

        function radius(mic) {
          return (outerR-innerR)*(Math.log(mic)-min)/(max-min) + innerR;
        };

        var barc = d3.svg.arc()
          .startAngle(function(d, i) {
            return angles[i] - (.6 / numBars);
          })
          .endAngle(function(d, i) {
            return angles[i] + (.6 / numBars);
          })
          .outerRadius(function(d) {
            return Math.max(radius(d.value), innerR) + 10;
          })
          .innerRadius(function(d) {
            return innerR
          });

        var bars = gEnter.data(pagerank)
          .append("path")
          .each(function(d) {
            d.outerRadius = 0;
          })
          .style("fill", function(d) {
            return 'LightSlateGray';
          })
          .attr("d", barc);

        bars.transition().ease("elastic").duration(1000)
          .delay(function(d, i) {
            return (33 - i) * 100;
          })
          .attrTween("d", function(d, index) {
            var i = d3.interpolate(d.outerRadius, barScale(+d.value));
            return function(t) {
              d.outerRadius = i(t);
              return barc(d, index);
            };
          });

        function groupClick(d) {
          d3.event.preventDefault();
          d3.event.stopPropagation();
          $scope.addFilter(d._id);
          resetChords();
        }

        function chordMouseover(d) {
          d3.event.preventDefault();
          d3.event.stopPropagation();
          dimChords(d);
          d3.select("#tooltip").style("opacity", 1);
          $scope.updateTooltip(matrix.read(d));
        }

        function hideTooltip() {
          d3.event.preventDefault();
          d3.event.stopPropagation();
          d3.select("#tooltip").style("opacity", 0);
          resetChords();
        }

        function resetChords() {
          d3.event.preventDefault();
          d3.event.stopPropagation();
          container.selectAll("path.chord").style("opacity", 0.9);
        }

        function dimChords(d) {
          d3.event.preventDefault();
          d3.event.stopPropagation();
          container.selectAll("path.chord").style("opacity", function(p) {
            if (d.source) { // COMPARE CHORD IDS
              return (p._id === d._id) ? 0.9 : 0.1;
            } else { // COMPARE GROUP IDS
              return (p.source._id === d._id || p.target._id === d._id) ? 0.9 : 0.1;
            }
          });
        }
      }; // END DRAWCHORDS FUNCTION

      function resize() {
        var width = $el.parent()[0].clientWidth;
        svg.attr({
          width: width,
          height: width / (size[0] / size[1])
        });
      }

      resize();

      $window.addEventListener("resize", function() {
        resize();
      });
    }; // END LINK FUNCTION

    return {
      link: link,
      restrict: 'EA'
    };

  }
]);
