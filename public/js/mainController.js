app = angular.module('app', []);
input = {
  'adjacency': './data/adjacency.csv',
  'pagerank': './data/pagerank.csv'
}

isString = function(obj) {
  return toString.call(obj) == '[object String]';
}

function chart($scope) {

  if (!$scope.master) {
    $scope.master = {
      'adjacency': [],
      'pagerank': []
    };
  }

  function updateAdj(x) {
    x.forEach(function(d) {
      if (d.source != d.target) {
        d.flow1 = +d.flow1;
        d.flow2 = +d.flow2;

        $scope.master['adjacency'].push(d);
      }

    });
  }

  function updatePG(x) {

    x.forEach(
      function(d) {
        d.value = +d.value;
        $scope.master['pagerank'].push(d);
      });
  }

  $scope.filters = {};
  $scope.hasFilters = false;

  $scope.tooltip = {};

  // FORMATS USED IN TOOLTIP TEMPLATE IN HTML
  $scope.pFormat = d3.format(".1%"); // PERCENT FORMAT
  $scope.qFormat = d3.format(",.0f"); // COMMAS FOR LARGE NUMBERS

  $scope.updateTooltip = function(data) {
    $scope.tooltip = data;
    $scope.$apply();
  }

  $scope.addFilter = function(name) {
    $scope.hasFilters = true;
    $scope.filters[name] = {
      name: name,
      hide: true
    };
    $scope.$apply();
  };

  $scope.update = function() {

    var adjacency = $scope.master['adjacency'];
    var pagerank = $scope.master['pagerank'];

    if (adjacency && pagerank && $scope.hasFilters) {
      $scope.drawChords(adjacency.filter(function(d) {
        var fl = $scope.filters;
        var v1 = d.source,
          v2 = d.target;

        if ((fl[v1] && fl[v1].hide) || (fl[v2] && fl[v2].hide)) {
          return false;
        }
        return true;
      }), pagerank.filter(function (d, i) {
        return !($scope.filters[i] && $scope.filters[i].hide);
      }));

    } else if (adjacency && pagerank) {
      $scope.drawChords(adjacency, pagerank);
    }
  };


  if (isString(input['adjacency'])) {
    // IMPORT THE CSV DATA
    d3.csv(input['adjacency'], function(err, data) {
      updateAdj(data);

      d3.csv(input['pagerank'], function(err, data) {
        updatePG(data);
        $scope.update();
      });
    });

  } else {

    updateAdj(input['adjacency']);
    updatePG(input['pagerank']);
    $scope.update();
  }

  $scope.$watch('filters', $scope.update, true);

}

app.controller('mainCntrl', ['$scope', chart]);
