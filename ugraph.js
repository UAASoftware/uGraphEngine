var Highcharts = require('highcharts');
require('highcharts/modules/exporting')(Highcharts);
var $ = require('jquery');
var regression = require('regression');

// -------------------------------------------------------------------------------------------------

var g_points_x = []
var g_points_y = []
var g_points_data = []
var g_points_curvefit = []
var g_segment_list = []
var g_chart;

var gtypes = {
    LINEAR: 0,
    QUADRATIC: 1,
    CUBIC: 2
};

function clearDataInput() {
    document.getElementById("data_input").value = '';
}

function updateDataInput() {
    var data_input = document.getElementById("data_input").value;
    if (data_input == null) {
        return;
    }

    var xflag = true;
    data_input = data_input.split(/\s+/);
    g_points_x = []; g_points_y = []; g_points_data = []

    // Read and parse the input from data points.
    for (i in data_input) {
        if (data_input[i].length <= 0) {
            continue;
        }
        if (xflag) {
            g_points_x.push(parseFloat(data_input[i]));
        } else {
            g_points_y.push(parseFloat(data_input[i]));
        }
        xflag = !xflag;
    }
    if (!xflag) {
        g_points_y.push(0);
    }

    // Re-format into [[x, y]] format that the graph uses.
    for (i in g_points_x) {
        g_points_data.push( [g_points_x[i], g_points_y[i]] );
    }

    // Read and parse the input from data points.
    if (g_points_data.length > 0) {
        g_chart.series[0].setData(g_points_data);
        g_chart.series[1].setData(g_points_curvefit);
    }
}

function renderSegmentList() {
    var segment_list_render = "";
    for (i in g_segment_list) {
        type_names = [ "Linear", "Quadratic", "Cubic" ]
        segment_list_render += "<div class='segment_item' id='segment_list'>\n";
        segment_list_render += "    type: " + type_names[ g_segment_list[i].type ] + "\n";
        segment_list_render += "</div><br>\n";
    }
    if (g_segment_list.length == 0) {
        segment_list_render = "No segments in current graph. Click the Add Segment button to begin.";
    }
    
    $(function () {
        $("#segment_list").html(segment_list_render);
    });
}

function addSegment() {
    g_segment_list.push({
        type: gtypes.LINEAR,
        minX: 0.0,
        maxX: 1.0,
    });
    renderSegmentList();
}

// Render the graph. We only render the graph once; after that we just keep updating it.
$(function () { 
    g_chart = Highcharts.chart('graph_plot', {
        chart: {
            type: 'line'
        },
        title: {
            text: ''
        },
        xAxis: {
            title: {
                text: 'X'
            }
        },
        yAxis: {
            title: {
                text: 'Y'
            }
        },
        series: [{
            lineWidth: 0.75,
            name: 'data points',
            data: [
                [0, 0],
                [1, 1]
            ]
        }, {
            lineWidth: 0.75,
            name: 'fitted graph',
            data: [
                [0, 0],
                [1, 1.1]
            ]
        }]
    });
});

// Render the segment list on first load.
$("#segment_list").ready(function(){
    renderSegmentList();
});
