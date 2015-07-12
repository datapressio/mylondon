
function addHelp1() {
  var help1 = d3.select("body")
      .append("div")
      .attr("class","help help1")
      .html("Drag your highest preference to the top of this list. <strong>The map will change&nbsp;colour</strong> to show you the ideal place to live.");
  help1.append("div")
    .classed("text-center",true)
    .style("margin-top","9px")
    .append("button")
      .attr("class","btn btn-sm btn-primary")
      .html("Next &raquo;")
      .on("click", function() { help1.remove(); addHelp2(); });
  help1.append("div")
    .attr("class","arrow")
    .html("&#11017;");
}

function addHelp2() {
  var help2 = d3.select("body")
      .append("div")
      .attr("class","help help2")
      .html("Click on a map cell to download detailed information from the London DataStore.");
  help2.append("div")
    .classed("text-center",true)
    .style("margin-top","9px")
    .append("button")
      .attr("class","btn btn-sm btn-primary")
      .text("Got it!")
      .on("click", function() { help2.remove(); });
  help2.append("div")
    .attr("class","arrow")
    .html("&#11016;");
}
addHelp1();



function safeParseInt( str, if_nan ) {
  if (if_nan==undefined) {
    if_nan = 0;
  }
  var out = parseInt(str);
  if (isNaN(out)) {
    return if_nan;
  }
  return out;
}
function safeParseFloat( str, if_nan ) {
  if (if_nan==undefined) {
    if_nan = 0;
  }
  var out = parseFloat(str);
  if (isNaN(out)) {
    return if_nan;
  }
  return out;
}
function scoreForWord(word) {
  if (word=="Below Average") {
    return 0.3;
  }
  else if (word=="Average") {
    return 0.5;
  }
  else if (word=="Above Average") {
    return 0.8;
  }
  else if (word=="Excellent") {
    return 1.0;
  }
  else {
    console.error("Unrecognised word: ",word);
    return 0;
  }
}

window.MyCity = {

    schoolGraphCreate(parent_node) {
      var width = 120, 
          height = 120;
      var svg = parent_node.append("svg")
          .attr("width", width)
          .attr("height", height)
        .append("g")
          .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
      var radius = 55;
      for (var i=0;i<3;i++) {
        svg.append("circle")
          .attr("r", radius - 5 - (i*15) )
          .attr("fill", "none")
          .attr("stroke", "#777");
      }
      return svg;
    },

    schoolGraphUpdate(data) {
      popup.select('.box-schools h3').html("Overall: <span class=\"color\">"+data.scores.schools+"</span>");
      function render_school_text( title, scores ) {
        out = '<table><thead><tr><th colspan="2">'+title+'</th></tr></thead>';
        out += '<tbody>';
        for (var i=0;i<4;i++) {
          out += '<tr><td style="color: '+scores[i].color+'"><div>'+scores[i].name+'</div></td><td style="font-weight: bold; text-align: right; padding-left: 4px; color: '+scores[i].color+'">'+scores[i].value+'%</td></tr>';
        }
        out += '</tbody>';
        out += '</table>';
        return out;
      }
      var school_p_data = [
        safeParseInt(data.schools['PSchool1Percent']),
        safeParseInt(data.schools['PSchool2Percent']),
        safeParseInt(data.schools['PSchool3Percent']),
      ];
      school_p_data.push( 100 - d3.sum(school_p_data) );
      var school_p_color = [
        "#96bf32",
        "#eed545",
        "#db6b66",
        "transparent",
      ];
      var school_s_data = [
        safeParseInt(data.schools['SSchool1Percent']),
        safeParseInt(data.schools['SSchool2Percent']),
        safeParseInt(data.schools['SSchool3Percent']),
      ];
      school_s_data.push( 100 - d3.sum(school_s_data) );
      var school_s_color = [
        "#c4d2c9",
        "#5da7a8",
        "#33ace0",
        "transparent",
      ];
      // ===
      var school_p_text = [
        { "name" : data.schools['PSchoolName1'], "value" : school_p_data[0], "color" : school_p_color[0] },
        { "name" : data.schools['PSchoolName2'], "value" : school_p_data[1], "color" : school_p_color[1] },
        { "name" : data.schools['PSchoolName2'], "value" : school_p_data[2], "color" : school_p_color[2] },
        { "name" : "Unknown",                    "value" : school_p_data[3], "color" : "#999" },
      ];
      var school_s_text = [
        { "name" : data.schools['SSchoolName1'], "value" : school_s_data[0], "color" : school_s_color[0] },
        { "name" : data.schools['SSchoolName2'], "value" : school_s_data[1], "color" : school_s_color[1] },
        { "name" : data.schools['SSchoolName2'], "value" : school_s_data[2], "color" : school_s_color[2] },
        { "name" : "Unknown",                    "value" : school_s_data[3], "color" : "#999" },
      ];
      popup.select(".box-schools .left  .text").html( render_school_text("Primary Schools", school_p_text) );
      popup.select(".box-schools .right .text").html( render_school_text("Secondary Schools", school_s_text) );

      // ===
      var pie = d3.layout.pie()
          .sort(null);
      function school_arc(x,i) {
        var radius = 55;
        var r = radius - i*15;
        var arc = d3.svg.arc()
          .outerRadius( r )
          .innerRadius( r - 10 );
        return arc(x);
      } 
      // Store the displayed angles in _current.
      // Then, interpolate from _current to the new angles.
      // During the transition, _current is updated in-place by d3.interpolate.
      function arcTween(a, index) {
        var i = d3.interpolate(this._current, a);
        this._current = i(0);
        return function(t) {
          return school_arc(i(t), index);
        };
      }
      // ===
      if ( this.schoolPrimary == undefined ) {
        this.schoolPrimary = this.schoolGraphCreate( d3.select(".box-schools .graph .left") );
        this.schoolPrimary.selectAll('path')
          .data( pie(school_p_data) )
          .enter().append("path")
            .attr("fill",function(x,i) { return school_p_color[i] })
            .attr("d", school_arc)
            .each(function(d) { this._current = d; }); // store the initial angles
      }
      else {
        this.schoolPrimary.selectAll('path')
          .data( pie(school_p_data) )
            .transition()
            .duration(750)
            .attrTween("d", arcTween); // redraw the arcs
      }
      // ===
      if ( this.schoolSecondary == undefined ) {
        this.schoolSecondary = this.schoolGraphCreate( d3.select(".box-schools .graph .right") );
        this.schoolSecondary.selectAll('path')
          .data( pie(school_s_data) )
          .enter().append("path")
            .attr("fill",function(x,i) { return school_s_color[i] })
            .attr("d", school_arc)
            .each(function(d) { this._current = d; }); // store the initial angles
      }
      else {
        this.schoolSecondary.selectAll('path')
          .data( pie(school_s_data) )
            .transition()
            .duration(750)
            .delay(150)
            .attrTween("d", arcTween); // redraw the arcs
      }
    },


    rentGraphUpdate: function(data) {
      var rent_data = [ 
        safeParseInt(data.rent['Ave_rent_1_bedroom']), 
        safeParseInt(data.rent['Ave_rent_2_bedroom']), 
        safeParseInt(data.rent['Ave_rent_3_bedroom']), 
        safeParseInt(data.rent['Ave_rent_4_bedroom']), 
      ];
      var min = Math.min(500, d3.min(rent_data)); 
      var max = Math.max(5000, d3.max(rent_data));
      var scale = d3.scale.linear()
        .domain([min,max])
        .range([50,220]);
      // ===
      popup.select('.box-rent .graph').selectAll(".top").data(rent_data)
        .style('height', function(x) { return scale(x)+"px"; } );

      popup.select('.box-rent .graph').selectAll(".title").data(rent_data)
        .style('bottom', function(x) { return scale(x)+"px"; } )
        .text(function(x) { return "£"+x; } );
    },

    transportGraphUpdate: function(data) {
      popup.select('.box-transport h3').html("Overall: <span class=\"color\">"+data.scores.transport+"</span> Zone: <span class=\"color\">"+data.fareZone+"</span>");
      // ====
      var timeToBank = [
        { color: '#e8dec8', img : "walk.png", minutes:data.timeToBank.walking_time_mins, miles: data.timeToBank.walking_distance_miles },
        { color: '#eed545', img : "cycle.png",    minutes:data.timeToBank.cycling_time_mins, miles: data.timeToBank.cycling_distance_miles },
        { color: '#db6b66', img : "public-transport.png",    minutes:data.timeToBank.public_transport_time_mins, miles: '--' },
        { color: '#5da7a8', img : "car.png",     minutes:data.timeToBank.driving_time_mins, miles: data.timeToBank.driving_distance_miles },
      ];
      popup.select(".box-transport .graph")
        .selectAll(".cell")
        .data(timeToBank)
        .enter()
          .append("div")
          .classed("cell",true)
          .html( function(d) { return '<img src="/http/art/'+d.img+'"/><div class="minutes" style="color: '+d.color+'">0</div><div class="word word-minutes" style="color: '+d.color+'">MINS</div><div class="miles">0.00</div><div class="word word-miles">MILES</div>'; } )
          .each( function(d) { this._current = d; });
      // ====
      function minutesTween(d) {
        var current = this._current;
        if (current==undefined) { 
          current = 0; 
        }
        var newValue = safeParseInt(d.minutes,0);
        var i = d3.interpolate(current, newValue);
        this._current = newValue;
        return function(t) {
          this.textContent = Math.round(i(t));
        };
      }
      function milesTween(d) {
        var current = this._current;
        if (current==undefined) { 
          current = 0; 
        }
        var newValue = safeParseFloat(d.miles,0);
        var i = d3.interpolate(current, newValue);
        this._current = newValue;
        return function(t) {
          var n = i(t).toFixed(2);
          if (n=="0.00") {
            n = "??";
          }
          this.textContent = n;
        };
      }
      popup.selectAll(".box-transport .graph .minutes")
        .data( timeToBank )
        .transition()
        .duration(750)
        .tween("text", minutesTween);
      popup.selectAll(".box-transport .graph .miles")
        .data( timeToBank )
        .transition()
        .duration(750)
        .tween("text", milesTween);
    },

    greenSpaceGraphUpdate: function(data) {
      popup.select('.box-greenspace h3').html("Overall: <span class=\"color\">"+data.scores.green_space+"</span>");
      var max = 30;
      var colz = d3.interpolateRgb("#e8dec8","#5da173");
      var cells = popup.select('.box-greenspace .green-space-meter').selectAll('.cell').data(d3.range(max));
      var score = scoreForWord(data.scores.green_space);
      if (this._lastGreenScore==undefined) {
        this._lastGreenScore = 0;
      }
      cells.enter()
        .append('div')
        .classed('cell',true)
        .style("background-color",function(d) { return colz(d/max) });
      cells.style("opacity",0.2);
      cells.transition()
        .duration(150)
        .delay(function(d) { return d*12; })
        .style("opacity", function(d) { return score > (d/max) ? 1 : 0.2;});
    },




    safetyGraphCreate(parent_node) {
      var width = 222, 
          height = 222;
      var svg = parent_node.append("svg")
          .attr("width", width)
          .attr("height", height)
        .append("g")
          .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
      return svg;
    },

    safetyGraphUpdate(data) {
      popup.select('.box-safety h3').html("Overall: <span class=\"color\">"+data.scores.safety+"</span>");
      var arc = d3.svg.arc()
        .outerRadius( 111 )
        .innerRadius( 94 )
      // Store the displayed angles in _current.
      // Then, interpolate from _current to the new angles.
      // During the transition, _current is updated in-place by d3.interpolate.
      function arcTween(d) {
        var i = d3.interpolate(this._current, d);
        this._current = i(0);
        return function(t) {
          return arc(i(t));
        };
      }
      var pie = d3.layout.pie()
          .sort(null)
          .startAngle(-Math.PI/2)
          .endAngle(Math.PI/2);
      var score = scoreForWord(data.scores.safety);
      score = pie([ score, 1-score ]);
      // ===
      if ( this.safetyGraph == undefined ) {
        this.safetyGraph = this.safetyGraphCreate( d3.select(".box-safety .graph") );
        this.safetyGraph.selectAll('path')
          .data( score )
          .enter().append("path")
            .attr("fill",function(x,i) { return i==0?'transparent' : "rgba(0,0,0,0.8)"; })
            .attr("d", arc)
            .each(function(d) { this._current = d; }); // store the initial angles
      }
      else {
        this.safetyGraph.selectAll('path')
          .data( score )
            .transition()
            .duration(750)
            .attrTween("d", arcTween); // redraw the arcs
      }
    },

    plugin: {
        onClickOA: function(oa, lsoa) {
            // alert('Clicked OA: ' + oa + ', LSOA: ' + lsoa);
            // console.log("onClickOA",oa,lsoa);
            // popup.innerHTML = 'OA <a href="javascript: MyCity.plugin.close()">x</a>';
            popup.classed("offscreen",false);
            // if ( ! popup.selectAll(".box .loading")[0].length ) {
            //   popup.selectAll(".box")
            //     .append("div")
            //     .classed("loading",true)
            //     .text("Waiting for API...")
            //     .transition()
            //       .delay(500)
            //       .style("opacity","0.7");
            // }
        },

        onReceiveData: function(data) {
          d3.select('.help1').remove();
          d3.select('.help2').remove();
            popup.select('.box-rent h3').html("<span class=\"color\">"+data.postcode+":</span> Cost Per Month");
            // d3.selectAll(".box .loading").transition().style("opacity","0").each("end", function() { d3.selectAll(".box .loading").remove(); });
            MyCity.rentGraphUpdate(data);
            MyCity.schoolGraphUpdate(data);
            MyCity.transportGraphUpdate(data);
            MyCity.greenSpaceGraphUpdate(data);
            MyCity.safetyGraphUpdate(data);
            // ====
            var dataTable = "";
            dataTable += "<tr><td class=\"left\">Postcode</td><td class=\"right\">"+data.postcode+"</td></tr>";
            dataTable += "<tr><td class=\"left\">OA Code</td><td class=\"right\">"+data.oa+"</td></tr>";
            dataTable += "<tr><td class=\"left\">LSOA Code</td><td class=\"right\">"+data.geo.lsoa+"</td></tr>";
            dataTable += "<tr><td class=\"left\">Easting</td><td class=\"right\">"+data.geo.EASTING+"</td></tr>";
            dataTable += "<tr><td class=\"left\">Northing</td><td class=\"right\">"+data.geo.NORTHING+"</td></tr>";
            dataTable += "<tr><td class=\"left\">Longitude</td><td class=\"right\">"+data.geo.Longitude+"</td></tr>";
            dataTable += "<tr><td class=\"left\">Latitude</td><td class=\"right\">"+data.geo.Latitude+"</td></tr>";

            popup.select('.box-info1 .graph').html("<table>"+dataTable+"</table>");
            popup.select('.box-info2 .graph').html(data.areaDescription['OA_description']);
            popup.select('.box-info3 .graph').html(data.areaDescription['General_description']);
        },
        close: function() {
            popup.classed("offscreen",true);
            MyCity.close();
        }
    }
};

// Set up global namespace for popup
window.popup = d3.select("#mycity-popup");
popup.html('\
  <div class="main-logo">\
    <div class="line line-left"></div>\
    <div class="line line-right"></div>\
    <h1 class="middle">\
      INFORMATION\
      <a class="close-button" href="javascript:MyCity.plugin.close()">&times</a>\
    </h1>\
  </div>\
  <div class=\"box-table\">\
    <div class=\"box-row\">\
      <div class="box box-rent">\
        <H2>RENT</H2>\
        <h3></h3>\
        <div class="graph">\
          <div class="rent-column rent-column-1">\
            <div class="title"></div>\
            <div class="top">\
              <div class="window tl"></div>\
              <div class="text">1</div>\
            </div>\
          </div>\
          <div class="rent-column rent-column-2">\
            <div class="title"></div>\
            <div class="top">\
              <div class="window tl"></div>\
              <div class="window tr"></div>\
              <div class="text">2</div>\
            </div>\
          </div>\
          <div class="rent-column rent-column-3">\
            <div class="title"></div>\
            <div class="top">\
              <div class="window tl"></div>\
              <div class="window tr"></div>\
              <div class="window bl"></div>\
              <div class="text">3</div>\
            </div>\
          </div>\
          <div class="rent-column rent-column-4">\
            <div class="title"></div>\
            <div class="top">\
              <div class="window tl"></div>\
              <div class="window tr"></div>\
              <div class="window bl"></div>\
              <div class="window br"></div>\
              <div class="text">4</div>\
            </div>\
          </div>\
        </div>\
      </div>\
      <div class="box box-schools">\
        <H2>SCHOOLS</H2>\
        <h3></h3>\
        <div class="graph">\
          <div class="left">\
            <div class="text"></div>\
          </div>\
          <div class="right">\
            <div class="text"></div>\
          </div>\
        </div>\
      </div>\
    </div>\
    <div class=\"box-row\">\
      <div class="box box-transport">\
        <H2>TRANSPORT</H2>\
        <h3>Travel Time to Bank Station:</h3>\
        <h4>Travel Time to Bank Station:</h4>\
        <div class="graph"></div>\
      </div>\
      <div class="box box-greenspace">\
        <H2>GREEN SPACE</H2>\
        <h3></h3>\
        <div class="graph">\
          <img class="trees" src="http/art/trees.png" />\
          <div class="green-space-meter"></div>\
        </div>\
      </div>\
    </div>\
    <div class=\"box-row\">\
      <div class="box box-safety">\
        <H2>SAFETY</H2>\
        <h3></h3>\
        <div class="graph">\
          <img class="safety" src="/http/art/safety.png" />\
        </div>\
      </div>\
      <div class="box box-info1">\
        <H2>RAW DATA</H2>\
        <h3></h3>\
        <div class="graph"></div>\
      </div>\
    </div>\
    <div class=\"box-row\">\
      <div class="box box-info2">\
        <H2>AREA DESCRIPTION</H2>\
        <h3></h3>\
        <div class="graph"></div>\
      </div>\
      <div class="box box-info3">\
        <H2>REGIONAL DESCRIPTION</H2>\
        <h3></h3>\
        <div class="graph"></div>\
      </div>\
    </div>\
  </div>\
');
