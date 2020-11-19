(function(){
var attrArray = ["M_ed_ratio_2534", "M_ed_ratio_3544", "M_ed_ratio_4564", "Fm_ed_ratio_2534", "Fm_ed_ratio_3544", "Fm_ed_ratio_4564"];
var attrDict = {"M_ed_ratio_2534": ["Males Age 25-34"], "M_ed_ratio_3544": ["Males Age 35-44"], "M_ed_ratio_4564": ["Males Age 45-64"], "Fm_ed_ratio_2534": ["Females Age 25-34"], "Fm_ed_ratio_3544": ["Females Age 35-44"], "Fm_ed_ratio_4564":["Females Age 45-64"]
};
var expressed = attrArray[0]; 

var chartWidth = window.innerWidth * .45
    chartHeight = 285,
    leftPadding = 28, 
    rightPadding = 2,
    topBottomPadding = 5,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

var yScale = d3.scale.linear()
    .range([250, 0])
    .domain([0, 40]);

window.onload = setMap();

function setMap(){
   

    var width = window.innerWidth * 0.45;
        height = 300;
    

    var maptitletext = d3.select("#maptitle")
        .text("Ratio of Postsecondary Degrees to No High School Diplomas in Pennsylvania")
        .attr("class", "mapTitletext")
        .attr("width", "100%")
        .attr("margin", "8px");
    
    var map = d3.select("#mapchartdiv")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);
    
    var projection = d3.geo.conicEqualArea()
        .center([0, 37])
        .rotate([77.5, -4])
        .parallels([20, 42])
        .scale(6000)
        .translate([width/2, height/2])
    
    var path = d3.geo.path()
        .projection(projection);


    d3.queue()
        .defer(d3.csv, "data/dataTable.csv")
        .defer(d3.json, "data/states.topojson")
        .defer(d3.json, "data/pa.topojson")
        .defer(d3.json, "data/counties.topojson")
        .await(callback);

    function callback(error, csvData, states, paST, counties){

    
        
        var USstates = topojson.feature(states, states.objects.NEstates),
            paState = topojson.feature(paST, paST.objects.pa),
            paCounties = topojson.feature(counties, counties.objects.pa_counties).features;


        var states = map.append("path")
            .datum(USstates)
            .attr("class", "states")
            .attr("d", path);

        var pennsylvania = map.append("path")
            .datum(paState)
            .attr("class", "pa")
            .attr("d", path);



        paCounties = joinData(paCounties, csvData);

        

        var colorScale = makeColorScale(csvData);

        setEnumerationUnits(paCounties, map, path, colorScale);
        
        setChart(csvData, colorScale);

        createDropdown(csvData, attrDict);
        
        dataTitle(csvData);

    };
};
function dataTitle(csvData){
    var title = d3.select("#attselector")
        .data(csvData)
        .append("text")
        .attr("class", "dataTitle")
        .text("Ratio of Post-Secondary Degrees to No High School Diplomas for " + attrDict[expressed][0] + " by County")
        .style("font-weight", "bold");

};

function setChart(csvData, colorScale){
   
    
    var chart = d3.select("#mapchartdiv")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("transform", translate);
    


    var bars = chart.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
            return "bar " + d.area;
        })
        .attr("width", chartInnerWidth / csvData.length - 1)
        .on("mouseover", highlight)
        .on("mouseout", dehighlight)
        .on("mousemove", moveLabel);
        var desc = bars.append("desc")
            .text('{"fill-opacity": "1", "stroke": "#444543", "stroke-width": ".3px"}')
        .attr("x", function(d,i){
            return i * (chartInnerWidth / csvData.length) + leftPadding;

        })
        .attr("height", function(d, i){
            return 285 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) - topBottomPadding *2;

        })
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });

  


        
    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient("left");
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
    
    updateChart(bars, csvData.length, colorScale);

};



function joinData(paCounties, csvData){
    for (var i=0; i < csvData.length; i++){
        var csvRegion = csvData[i]; 
        var csvKey = csvRegion.area;

        for (var a=0; a < paCounties.length; a++){
            var geojsonProps = paCounties[a].properties;
            var geojsonKey = geojsonProps.area;

            if (geojsonKey == csvKey){
                attrArray.forEach(function(attr){
                    var val = parseFloat(csvRegion[attr]);
                    geojsonProps[attr] = val;
                });
            };
        };
    };
    return paCounties;
    
};

function setEnumerationUnits(paCounties, map, path, colorScale){
    var counties = map.selectAll(".counties")
        .data(paCounties)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "counties " + d.properties.area;
    })
    .attr("d", path)
    .style("fill", function(d){
        return choropleth(d.properties, colorScale);
    })
    .on("mouseover", function(d){
        highlight(d.properties);
    })
    .on("mouseout", function(d){
        dehighlight(d.properties);
    })
    .on("mousemove", moveLabel);
    
    var desc = counties.append("desc")
        .text('{"fill-opacity": "1", "stroke": "#000", "stroke-width": "0.5px"}');
    
};

function makeColorScale(data){
    var colorClasses = [
        "#ffffd4",
        "#fed98e",
        "#fe9929",
        "#d95f0e",
        "#993404"
    ];
    
    var colorScale = d3.scale.quantile()
        .range(colorClasses);

    var minmax = [
        d3.min(data, function(d) { return parseFloat(d[expressed]); }),
        d3.max(data, function(d) { return parseFloat(d[expressed]); })
    ];

    colorScale.domain(minmax);

    return colorScale;
};

function choropleth(props, colorScale){
    var val = parseFloat(props[expressed]);
    if (typeof val == 'number' && !isNaN(val)){
        return colorScale(val);
    } else {
        return "#CCC";
    };
};



function createDropdown(csvData, attrDict){
    var dropdown = d3.select("#attselector")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, csvData)
        });

    var titleOption = dropdown.append("option")
        .attr("class", "titleOption") 
        .attr("disabled", "true") 
        .text("Select Gender & Age Range");
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d})
        .text(function(d){
            return attrDict[d][0]
        });
};

function changeAttribute(attribute, csvData){
    expressed = attribute;

    var colorScale = makeColorScale(csvData);

    var counties = d3.selectAll(".counties")
        .transition()
        .duration(1000)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale)
        });

    var bars = d3.selectAll(".bar")
        .sort(function(a,b){
            return b[expressed] - a[expressed];
        })
        .transition()
        .delay(function(d,i){
            return i * 10
        })
        .duration(250);
    
    updateChart(bars, csvData.length, colorScale);
};

function updateChart(bars, n, colorScale){
    bars.attr("x", function(d,i){
        return i * (chartInnerWidth / n) + leftPadding;
    })
    .attr("height", function(d, i){
        return 250 - yScale(parseFloat(d[expressed]));
    })
    .attr("y", function(d,i){
        return yScale(parseFloat(d[expressed])) + topBottomPadding;
    })
    .style("fill", function(d){
        return choropleth(d, colorScale);
    })
    .style("stroke",  "#444543")
    .style("stroke-width", ".3px");

    var dataTitle = d3.select(".dataTitle")
        .text("Ratio of Post-Secondary Degrees to No High School Diplomas for " + attrDict[expressed][0] + " by County");
    

};


function highlight(props){

    var selected = d3.selectAll("." + props.area) 
        .style("fill-opacity", "0")
        .style("stroke", "#313300")
        .style("stroke-width", "3")
        setLabel(props);
};

function dehighlight(props){
    var selected = d3.selectAll("." + props.area)
        .style("fill-opacity", function(){
            return getStyle(this, "fill-opacity")
        })
        .style("stroke", function(){
            return getStyle(this, "stroke")
        })
        .style("stroke-width", function(){
            return getStyle(this, "stroke-width")
        });
    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc")
            .text();
        var styleObject = JSON.parse(styleText);

        return styleObject[styleName];
    };
    d3.select(".infolabel")
        .remove();
};

function setLabel(props){
    var labelAttribute = "<h1>" + props[expressed] + "</h1><b>";

    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.area + "_label")
        .html(labelAttribute);

    var countyName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.area + " County");
};

function moveLabel(){
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;

    var x1 = d3.event.clientX + 10,
        y1 = d3.event.clientY - 75,
        x2 = d3.event.clientX - labelWidth - 10,
        y2 = d3.event.clientY + 25;
    
    var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
    var y = d3.event.clientY < 75 ? y2 : y1;
    
    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
}

})();