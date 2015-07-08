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
            // ====
            popup.select('.box-rent h3').html("<span class=\"color\">"+data.postcode+":</span> Cost Per Month");
            var graph_rent = popup.select('.box-rent .graph');
            graph_rent.html( "<pre>"+JSON.stringify(data.rent)+"</pre>" );
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
            popup.select('.box-greenspace h3').html("Overall: <span class=\"color\">"+data.scores.green_space+"</span>");
            var graph_greenspace = popup.select('.box-greenspace .graph');
            graph_greenspace.html( "<pre>Score: Unknown</pre>");
            // ====
            popup.select('.box-safety h3').html("Overall: <span class=\"color\">"+data.scores.safety+"</span>");
            var safety_n = data.summary.safety;
            console.log(safety_n);
            safety_n = 1+Math.floor(Math.random()*4);

            var graph_safety = popup.select('.box-safety .graph');
            graph_safety.selectAll(".clip").data([safety_n])
              .style("width",function(d) { return (d*25)+"%"})
              .style("border-color",function(d) { return d==4 ? "transparent" : "#fff"; });
            // ====
            popup.select('.box-information h3').html("Postcode: <span class=\"color\">"+data.postcode+"</span> &nbsp;Area: <span class=\"color\">"+data.oa+"</span>");
            var graph_information = popup.select('.box-information .graph');
            console.log(data.areaDescription);
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
        <div class="graph"></div>\
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
        <div class="graph"></div>\
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
