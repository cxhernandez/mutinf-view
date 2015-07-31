app = angular.module('app', []);
input = './data/example.csv'

isString = function(obj) {
  return toString.call(obj) == '[object String]';
}

function chart($scope) {

  if (!$scope.master) {
    $scope.master = [];
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
    var data = $scope.master;
    if (data && $scope.hasFilters) {
      $scope.drawChords(data.filter(function(d) {
        var fl = $scope.filters;
        var v1 = d.source,
          v2 = d.target;


        if ((fl[v1] && fl[v1].hide) || (fl[v2] && fl[v2].hide)) {
          return false;
        }
        return true;
      }));
    } else if (data) {
      $scope.drawChords(data);
    }
  };


  if (isString(input)) {
    // IMPORT THE CSV DATA
    d3.csv(input, function(err, data) {

      data.forEach(function(d) {
        d.flow1 = +d.flow1;
        d.flow2 = +d.flow2;

        $scope.master.push(d);

      });
      $scope.update();
    });
  } else {
    
    input.forEach(function(d) {
      d.flow1 = +d.flow1;
      d.flow2 = +d.flow2;

      $scope.master.push(d);

    });
    $scope.update();

  }

  $scope.$watch('filters', $scope.update, true);

}

app.controller('mainCntrl', ['$scope', chart]);
