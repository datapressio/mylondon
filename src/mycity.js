window.MyCity = {
    plugin: {
        onClickOA: function(oa, lsoa) {
            // alert('Clicked OA: ' + oa + ', LSOA: ' + lsoa);
            console.log("onClickOA",oa,lsoa);
            // popup.innerHTML = 'OA <a href="javascript: MyCity.plugin.close()">x</a>';
            popup.style("right","0%");
        },
        onReceiveData: function(data) {
            console.info('Data for popup:', data);
            function scoreWord(val) {
              // TODO what are the actual thresholds?
              if (val<0)    { return "Unknown"; }
              if (val<0.4)  { return "Below Average"; }
              if (val<0.6)  { return "Average"; }
              if (val<0.8)  { return "Above Average"; }
              if (val<=1.0) { return "Excellent"; }
              return val;
            }
            function scoreNumber(val) {
              // TODO what are the actual thresholds?
              if (val<0)    { return 0; }
              if (val<0.4)  { return 1; }
              if (val<0.6)  { return 2; }
              if (val<0.8)  { return 3; }
              if (val<=1.0) { return 4; }
              return 0;
            }


            // ====
            popup.select('.box-rent h3').html("<span class=\"color\">"+data.postcode+":</span> Cost Per Month");
            var rent_data = [ 
              parseInt(data.rent['Ave_rent_1_bedroom']), 
              parseInt(data.rent['Ave_rent_2_bedroom']), 
              parseInt(data.rent['Ave_rent_3_bedroom']), 
              parseInt(data.rent['Ave_rent_4_bedroom']), 
            ];
            var rent_min = Math.min(500, d3.min(rent_data)); 
            var rent_max = Math.max(2800, d3.max(rent_data));
            console.log(rent_data, rent_min, rent_max, d3.min(rent_data));
            var rent_scale = d3.scale.linear()
              .domain([rent_min,rent_max])
              .range([50,140]);
            popup.select('.box-rent .graph').selectAll(".top").data(rent_data)
              .style('height', function(x) { return rent_scale(x)+"px"; } );
            popup.select('.box-rent .graph').selectAll(".title").data(rent_data)
              .style('bottom', function(x) { return 27+rent_scale(x)+"px"; } )
              .text(function(x) { return "£"+x; } );
            // ====
            popup.select('.box-schools h3').html("Overall: <span class=\"color\">"+data.scores.schools+"</span>");
            var graph_schools = popup.select('.box-schools .graph');
            graph_schools.html( "<pre>"+JSON.stringify(data.schools)+"</pre>" );
            // ====
            popup.select('.box-transport h3').html("Overall: <span class=\"color\">"+data.scores.transport+"</span>");
            var graph_transport = popup.select('.box-transport .graph');
            graph_transport.html( "<pre>Zone "+JSON.stringify(data.fareZone)+"</pre>" +
                           "<pre>"+JSON.stringify(data.timeToBank)+"</pre>");
            // ====
            popup.select('.box-greenspace h3').html("Overall: <span class=\"color\">"+scoreWord(data.scores.green_space)+"</span>");
            // var green_n = scoreNumber(summaryData.safety) - 1;
            // var data_greenspace = d3.range(4).map( function(x) { return x<=green_n; });
            // var graph_greenspace = popup.select('.box-greenspace .graph');
            // graph_greenspace.selectAll(".tree").data(data_greenspace)
            //   .style("opacity", function(d) { return d?"1.0" : "0.2"; });

            // var green_bargraph_data = d3.range(20);
            // var green_bargraph = graph_greenspace.select(".tree-bar-graph").selectAll(".cell");
            // green_bargraph.data(green_bargraph_data).enter()
            //   .append("div")
            //   .classed("cell",true)
            //   .style("background-color", function(d) { return "#f0f"; });


            // graph_greenspace.html( "<pre>Score: Unknown</pre>");
            // ====
            popup.select('.box-safety h3').html("Overall: <span class=\"color\">"+data.scores.safety+"</span>");
            // var safety_n = data.summary.safety;
            // console.log(safety_n);
            // safety_n = 1+Math.floor(Math.random()*4);

            // var graph_safety = popup.select('.box-safety .graph');
            // graph_safety.selectAll(".clip").data([safety_n])
            //   .style("width",function(d) { return (d*25)+"%"})
            //   .style("border-color",function(d) { return d==4 ? "transparent" : "#fff"; });
            // ====
            popup.select('.box-information h3').html("Postcode: <span class=\"color\">"+data.postcode+"</span> &nbsp;Area: <span class=\"color\">"+data.oa+"</span>");
            var graph_information = popup.select('.box-information .graph');
            graph_information.html("<strong>Local Area:</strong><blockquote>"+data.areaDescription['OA_description']+"</blockquote><strong>Regional Description:</strong><blockquote>"+data.areaDescription['General_description']+"</blockquote>");
        },
        close: function() {
            popup.style("right","-45%");
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
        <div class="graph"></div>\
      </div>\
    </div>\
    <div class=\"box-row\">\
      <div class="box box-transport">\
        <H2>TRANSPORT</H2>\
        <h3></h3>\
        <div class="graph"></div>\
      </div>\
      <div class="box box-greenspace">\
        <H2>GREEN SPACE</H2>\
        <h3></h3>\
        <div class="graph">\
          <div class="tree-graph">\
            <img class="tree tree1" src="/http/art/tree1.png" />\
            <img class="tree tree2" src="/http/art/tree2.png" />\
            <img class="tree tree3" src="/http/art/tree3.png" />\
            <img class="tree tree4" src="/http/art/tree4.png" />\
          </div>\
          <div class="tree-bar-graph"></div>\
        </div>\
      </div>\
    </div>\
    <div class=\"box-row\">\
      <div class="box box-safety">\
        <H2>SAFETY</H2>\
        <h3></h3>\
        <div class="graph">\
          <div class="safety-graph">\
            <div class="noclip">\
              <img src="/http/art/safety-bg.png" />\
            </div>\
            <div class="clip">\
              <img src="/http/art/safety.png" />\
            </div>\
          </div>\
        </div>\
      </div>\
      <div class="box box-information">\
        <H2>AREA INFORMATION</H2>\
        <h3></h3>\
        <div class="graph"></div>\
      </div>\
    </div>\
  </div>\
');
