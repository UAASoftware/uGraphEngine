// -------------------------------------------------------------------------------------------------

// ref : http://stackoverflow.com/questions/15935365/convert-float-to-bytes-in-javascript-without-float32array
function toFloat32(value) {
    var bytes = 0;
    switch (value) {
        case Number.POSITIVE_INFINITY: bytes = 0x7F800000; break;
        case Number.NEGATIVE_INFINITY: bytes = 0xFF800000; break;
        case +0.0: bytes = 0x00000000; break;
        case -0.0: bytes = 0x80000000; break;
        default:
            if (Number.isNaN(value)) { bytes = 0x7FC00000; break; }

            if (value <= -0.0) {
                bytes = 0x80000000;
                value = -value;
            }

            var exponent = Math.floor(Math.log(value) / Math.log(2));
            var significand = ((value / Math.pow(2, exponent)) * 0x00800000) | 0;

            exponent += 127;
            if (exponent >= 0xFF) {
                exponent = 0xFF;
                significand = 0;
            } else if (exponent < 0) exponent = 0;

            bytes = bytes | (exponent << 23);
            bytes = bytes | (significand & ~(-1 << 23));
        break;
    }
    return bytes;
};

// ref: http://stackoverflow.com/questions/4414077/read-write-bytes-of-float-in-js
// 1 -1 838860
function fromFloat32(bytes) {

    var sign = (bytes & 0x80000000) ? -1 : 1;
    var exponent = ((bytes >> 23) & 0xFF) - 127;
    var significand = (bytes & ~(-1 << 23));

    if (exponent == 128) 
        return sign * ((significand) ? Number.NaN : Number.POSITIVE_INFINITY);

    if (exponent == -127) {
        if (significand == 0) return sign * 0.0;
        exponent = -126;
        significand /= (1 << 22);
    } else significand = (significand | (1 << 23)) / (1 << 23);

    return sign * significand * Math.pow(2, exponent);
}

function writeGraphCodeHex(v)
{
    var hex = v.toString(16);
    while (hex.length < 2) {
        hex = "0" + hex;
    }
    return hex;
}

function writeGraphCodeInt(bv)
{
    return writeGraphCodeHex( (bv >> 24) & 0xFF ) +
           writeGraphCodeHex( (bv >> 16) & 0xFF ) +
           writeGraphCodeHex( (bv >> 8 ) & 0xFF ) +
           writeGraphCodeHex( (bv >> 0 ) & 0xFF );
}

function writeGraphCodeFloat(v)
{
    return writeGraphCodeInt(toFloat32(v));
}

g_currentReadCursor = 0;
function readGraphCodeHexStr(v)
{
    return readGraphCodeChar(v) + readGraphCodeChar(v);
}
function readGraphCodeHex(v)
{
    return parseInt(readGraphCodeHexStr(v), 16);
}
function readGraphCodeChar(v)
{
    if (g_currentReadCursor >= v.length) return "0";
    return v[ g_currentReadCursor++ ];
}
function readGraphCodeInt(v)
{
    return ((parseInt(readGraphCodeHexStr(v), 16) & 0xFF) << 24) +
           ((parseInt(readGraphCodeHexStr(v), 16) & 0xFF) << 16) +
           ((parseInt(readGraphCodeHexStr(v), 16) & 0xFF) << 8 ) +
           ((parseInt(readGraphCodeHexStr(v), 16) & 0xFF) << 0 );
}
function readGraphCodeFloat(v)
{
    return fromFloat32(readGraphCodeInt(v));
}

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
    CUBIC: 2,
    QUARTIC: 3,
    QUINTIC: 4,
    POLYNOMIAL_DEGREE_6: 5,
    POLYNOMIAL_DEGREE_7: 6,
    POLYNOMIAL_DEGREE_8: 7,
    POLYNOMIAL_DEGREE_9: 8,
    SIGMOIDAL: 9,
    CONNECTOR: 10,
    GRAPH_TYPE_MAX: 11
};

function getCoeff(type)
{
    var num_coeff = 0;
    if (type >= gtypes.LINEAR && type <= gtypes.POLYNOMIAL_DEGREE_9) {
        num_coeff = (type - gtypes.LINEAR) + 1;
    } else if (type == gtypes.SIGMOIDAL) {
        num_coeff = 3;
    } else if (type == gtypes.CONNECTOR) {
        num_coeff = 1;
    }
    return num_coeff;
}

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

function splitDataInput() {
    updateDataInput();
    g_segment_list = [];
    for (var i = 0; i < g_points_data.length; i++) {
        if (i + 1 >= g_points_data.length) break;
        addSegment();
        g_segment_list[g_segment_list.length - 1].minX = g_points_data[i][0];
        g_segment_list[g_segment_list.length - 1].maxX = g_points_data[i + 1][0];
    }
    for (var i = 0; i < g_segment_list.length; i++) {
        curveFitSegment(i);
    }
}

function changeSegmentType(list_object, i) {
    g_segment_list[i].type = list_object.selectedIndex;
    if (g_segment_list[i].type < 0) g_segment_list[i].type = 0;
    if (g_segment_list[i].type >= gtypes.GRAPH_TYPE_MAX) {
        g_segment_list[i].type = gtypes.GRAPH_TYPE_MAX - 1;
    }
    renderSegmentList();
}
function changeSegmentMinX(input_object, i) {
    g_segment_list[i].minX = parseFloat(input_object.value);
    renderSegmentList();
}
function changeSegmentMaxX(input_object, i) {
    g_segment_list[i].maxX = parseFloat(input_object.value);
    renderSegmentList();
}
function changeSegmentCoefficient(input_object, i, j) {
    g_segment_list[i].coeff[j] = parseFloat(input_object.value);
    renderSegmentList();
}

function getSegmentPointsData(s)
{
    var ret = [];
    for (i in g_points_data) {
        if (g_points_data[i][0] >= g_segment_list[s].minX && g_points_data[i][0] <= g_segment_list[s].maxX) {
            ret.push( [ g_points_data[i][0], g_points_data[i][1] ] );
        }
    }
    return ret;
}

function writeGraphCode()
{
    var code = "";
    code += writeGraphCodeHex(0xd8);
    code += writeGraphCodeHex(g_segment_list.length);
    for (i in g_segment_list) {
        code += writeGraphCodeHex(g_segment_list[i].type)
        code += writeGraphCodeFloat(g_segment_list[i].minX)
        code += writeGraphCodeFloat(g_segment_list[i].maxX)

        var num_coeff = getCoeff(g_segment_list[i].type);
        for (var j = 0; j <= num_coeff; j++) {
            code += writeGraphCodeFloat(g_segment_list[i].coeff[j]);
        }
    }
    code += writeGraphCodeHex(0x8d);
    document.getElementById("ugraphcode").value = code;
    document.getElementById("ugraphcode").style.backgroundColor = "#eDeDeD";
}

function readGraphCodeFailure()
{
    document.getElementById("ugraphcode").style.backgroundColor = "#FB759B";
    return 1;
}

function readGraphCode()
{
    var code = document.getElementById("ugraphcode").value;
    
    if (code.length < 4 || code.length % 2 != 0) return readGraphCodeFailure();
    if (code[0] != "d" || code[1] != "8") return readGraphCodeFailure();
    if (code[code.length - 1] != "d" || code[code.length - 2] != "8") return readGraphCodeFailure();

    g_currentReadCursor = 0;
    var magic = readGraphCodeHex(code);
    if (magic != 0xd8) {
        alert("Internal error while reading graph code.");
        alert(magic);
        return readGraphCodeFailure();
    }

    n_segments = readGraphCodeHex(code);
    t_seglist = []

    // Read in segment by segment.
    for (var i = 0; i < n_segments; i++) {

        var _type = readGraphCodeHex(code);
        var _minX = readGraphCodeFloat(code);
        var _maxX = readGraphCodeFloat(code);
        var _coeff = [];
        var num_coeff = getCoeff(_type);
        for (var j = 0; j <= num_coeff; j++) {
            _coeff.push(readGraphCodeFloat(code));
        }
        if (g_currentReadCursor >= code.length) {
            alert("Read off end of array.");
            return readGraphCodeFailure();
        }

        t_seglist.push({
            type: _type,
            minX: _minX,
            maxX: _maxX,
            coeff: _coeff
        });
    }

    // Read in segment by segment.
    g_segment_list = [];
    for (var i = 0; i < n_segments; i++) {
        g_segment_list.push(t_seglist[i]);
    }

    document.getElementById("ugraphcode").style.backgroundColor = "#eDeDeD";
    renderSegmentList();
    return 0;
}

function curveFitSegment(i) {
    updateDataInput();

    var segment_points_data = [];
    if (g_segment_list[i].type == gtypes.CONNECTOR) {
        // Connector fits to the two ends.
        segment_points_data.push([ g_segment_list[i].minX, evaluateGraph(g_segment_list[i].minX, false) ]);
        segment_points_data.push([ g_segment_list[i].maxX, evaluateGraph(g_segment_list[i].maxX, false) ]);
    } else {
        // General curve fitting fits to data points.
        segment_points_data = getSegmentPointsData(i);
        if (segment_points_data.length <= 0) {
            alert("Error while curve fitting - No data points in given range!");
            return;
        }
    }

    // Perform regression curvefit on the segment.
    if ((g_segment_list[i].type >= gtypes.LINEAR && g_segment_list[i].type <= gtypes.POLYNOMIAL_DEGREE_9) || g_segment_list[i].type == gtypes.CONNECTOR) {
        var num_coeff = getCoeff(g_segment_list[i].type);
        var result = regression('polynomial', segment_points_data, num_coeff);
        for (j in result.equation) {
            if (isNaN(result.equation[j])) {
                alert("Error while curve fitting - NaN recieved as coefficient!");
                return;
            }
        }
        for (j in result.equation) {
            g_segment_list[i].coeff[j] = result.equation[j];
        }
    } else {
        alert("This segment type does not support curve fitting.");
    }

    renderSegmentList();
}

function renderSegmentValueInput(name, value, callbackName)
{
    return "            <div class='div.segment_item_body'><div class='segment_item_left'>" + name + ":</div> " +
           "<div class='segment_item_right'>" + 
           "<input class='segment' value = " + value + " onchange='" + callbackName + "'></div></div><br>\n";

}

function evaluateGraph(x, allow_connectors = true)
{
    for (seg in g_segment_list) {
        if (x < g_segment_list[seg].minX || x > g_segment_list[seg].maxX) continue;
        if (g_segment_list[seg].type == gtypes.CONNECTOR && !allow_connectors) continue;

        var a = g_segment_list[seg].coeff[0];
        var b = g_segment_list[seg].coeff[1];
        var c = g_segment_list[seg].coeff[2];
        var d = g_segment_list[seg].coeff[3];
        var e = g_segment_list[seg].coeff[4];
        var f = g_segment_list[seg].coeff[5];
        var g = g_segment_list[seg].coeff[6];
        var h = g_segment_list[seg].coeff[7];
        var i = g_segment_list[seg].coeff[8];
        var j = g_segment_list[seg].coeff[9];

        switch (g_segment_list[seg].type) {
            case gtypes.LINEAR: return a + b*x;
            case gtypes.QUADRATIC: return a + b*x + c*x*x;
            case gtypes.CUBIC: return a + b*x + c*x*x + d*x*x*x;
            case gtypes.QUARTIC: return a + b*x + c*x*x + d*x*x*x + e*x*x*x*x;
            case gtypes.QUINTIC: return a + b*x + c*x*x + d*x*x*x + e*x*x*x*x + f*x*x*x*x*x;
            case gtypes.POLYNOMIAL_DEGREE_6: return a + b*x + c*x*x + d*x*x*x + e*x*x*x*x + f*x*x*x*x*x + g*x*x*x*x*x*x;
            case gtypes.POLYNOMIAL_DEGREE_7: return a + b*x + c*x*x + d*x*x*x + e*x*x*x*x + f*x*x*x*x*x + g*x*x*x*x*x*x + h*x*x*x*x*x*x*x;
            case gtypes.POLYNOMIAL_DEGREE_8: return a + b*x + c*x*x + d*x*x*x + e*x*x*x*x + f*x*x*x*x*x + g*x*x*x*x*x*x + h*x*x*x*x*x*x*x + i*x*x*x*x*x*x*x*x;
            case gtypes.POLYNOMIAL_DEGREE_9: return a + b*x + c*x*x + d*x*x*x + e*x*x*x*x + f*x*x*x*x*x + g*x*x*x*x*x*x + h*x*x*x*x*x*x*x + i*x*x*x*x*x*x*x*x + j*x*x*x*x*x*x*x*x*x;
            case gtypes.SIGMOIDAL: return d + (a - d) / (1.0 + Math.pow(x / c, b));
            case gtypes.CONNECTOR: return a + b*x;
            default:
                alert("Error: Unknown graph segment type!");
                return 0.0;
        }
    }
    return 0.0;
}

function getGraphFormulaStr(type)
{
    switch (type) {
        case gtypes.LINEAR: return "y = a + bx";
        case gtypes.QUADRATIC: return "y = a + bx + cx<sup>2</sup>";
        case gtypes.CUBIC: return "y = a + bx + c<sup>2</sup> + dx<sup>3</sup>";
        case gtypes.QUARTIC: return "y = a + bx + c<sup>2</sup> + dx<sup>3</sup> + ex<sup>4</sup>";
        case gtypes.QUINTIC: return "y = a + bx + c<sup>2</sup> + dx<sup>3</sup> + ex<sup>4</sup> + fx<sup>5</sup>";
        case gtypes.POLYNOMIAL_DEGREE_6: return "y = a + bx + c<sup>2</sup> + dx<sup>3</sup> + ex<sup>4</sup> + fx<sup>5</sup> + gx<sup>6</sup>";
        case gtypes.POLYNOMIAL_DEGREE_7: return "y = a + bx + c<sup>2</sup> + dx<sup>3</sup> + ex<sup>4</sup> + fx<sup>5</sup> + gx<sup>6</sup> + hx<sup>7</sup>";
        case gtypes.POLYNOMIAL_DEGREE_8: return "y = a + bx + c<sup>2</sup> + dx<sup>3</sup> + ex<sup>4</sup> + fx<sup>5</sup> + gx<sup>6</sup> + hx<sup>7</sup> + ix<sup>8</sup>";
        case gtypes.POLYNOMIAL_DEGREE_9: return "y = a + bx + c<sup>2</sup> + dx<sup>3</sup> + ex<sup>4</sup> + fx<sup>5</sup> + gx<sup>6</sup> + hx<sup>7</sup> + ix<sup>8</sup> + jx<sup>9</sup> ";
        case gtypes.SIGMOIDAL: return "y = d + (a - d) / (1.0 + (x / c)<sup>b</sup>)";
        case gtypes.CONNECTOR: return "y = a + bx";
        default:
            return "";
    }
}

function renderSegmentList() {
    var segment_list_render = "";
    writeGraphCode();

    // Re-render the segment list.
    for (i in g_segment_list) {
        type_names = [
            "Linear", "Quadratic Polynomial", "Cubic Polynomial", "Quartic Polynomial", "Quintic Polynomial",
            "6th Degree Polynomial", "7th Degree Polynomial", "8th Degree Polynomial", "9th Degree Polynomial", "Sigmoidal", "Connector"
        ];
        segment_list_render += "<div class='segment_item'>\n";
        
        segment_list_render += "    <div class='segment_header'>" + type_names[ g_segment_list[i].type ] + " Segment"
        segment_list_render += "            <button class = 'delete_segment' value='delete_segment' onclick='deleteSegment(" + i + ")'>X</button>";
        segment_list_render += "    </div>\n";
        
        segment_list_render += "    <div class='segment_body'>\n";

        // Common editors.
        segment_list_render += "            <center><p>" + getGraphFormulaStr(g_segment_list[i].type) + "</p></center>\n";
        segment_list_render += "            segment type: \n";
        segment_list_render += "            <select name='typelist' onchange='changeSegmentType(this, " + i + ")'>\n";
        for (j in type_names) {
            var stxt = j == g_segment_list[i].type ? "selected" : "";
            segment_list_render += "                <option " + stxt + ">" + type_names[j] + "</option>\n";
        }
        segment_list_render += "            </select><br>\n";
        segment_list_render += renderSegmentValueInput("minX", g_segment_list[i].minX, "changeSegmentMinX(this, " + i + ")");
        segment_list_render += renderSegmentValueInput("maxX", g_segment_list[i].maxX, "changeSegmentMaxX(this, " + i + ")");

        coefficient_names = [
            "a", "b", "c", "d", "e", "f", "g", "h", "i", "j"
        ];
        // Coefficients for polynomials.
        var num_coeff = getCoeff(g_segment_list[i].type);
        for (j = 0; j <= num_coeff; j++) {
            segment_list_render += renderSegmentValueInput(coefficient_names[j], g_segment_list[i].coeff[j], "changeSegmentCoefficient(this, " + i + ", " + j +")");
        }

        segment_list_render += "            <center><button value='add_segment' onclick='curveFitSegment(" + i + ")'>Curve Fit</button></center>\n";

        segment_list_render += "    </div>\n";

        segment_list_render += "</div><br>\n";
    }
    if (g_segment_list.length == 0) {
        segment_list_render = "No segments in current graph. Click the Add Segment button to begin.";
    }
    
    $(function () {
        $("#segment_list").html(segment_list_render);
    });

    // Re-render the graph.
    g_points_curvefit = [];
    
    // Find the min & max points over both data or segment.
    var minXGraph = 99999999.0; var maxXGraph = -99999999.0;
    for (i in g_points_data) {
        if (g_points_data[i][0] < minXGraph) minXGraph = g_points_data[i][0];
        if (g_points_data[i][0] > maxXGraph) maxXGraph = g_points_data[i][0];
    }
    for (i in g_segment_list) {
        if (g_segment_list[i].minX < minXGraph) minXGraph = g_segment_list[i].minX;
        if (g_segment_list[i].maxX > maxXGraph) maxXGraph = g_segment_list[i].maxX;
    }
    if (minXGraph >= maxXGraph) {
        return;
    }

    // Evaluate the graph, taking 200 samples.
    var rangeXGraph = maxXGraph - minXGraph;
    for (var i = 0.0; i <= 1.0; i += 0.005) {
        var x = minXGraph + i * rangeXGraph;
        var y = evaluateGraph(x);
        g_points_curvefit.push(
            [ x, y ]
        );
    }

    // Push updates to the graph rendering.
    if (g_points_curvefit.length > 0) {
        g_chart.series[1].setData(g_points_curvefit);
    }
}

function addSegment() {
    g_segment_list.push({
        type: gtypes.LINEAR,
        minX: 0.0,
        maxX: 1.0,
        coeff: [ 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0 ]
    });
    renderSegmentList();
}

function deleteSegment(i)
{
    g_segment_list.splice(i, 1);
    renderSegmentList();
}

// Render the graph. We only render the graph once; after that we just keep updating it.
$(function () { 
    g_chart = Highcharts.chart('graph_plot', {
        chart: {
            type: 'line'
        },
        title: {
            text: 'Input Data vs Graph'
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
