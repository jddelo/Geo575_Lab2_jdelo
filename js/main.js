//set general function to make these variables global
(function(){

var attrArray = ["M_ed_ratio_2534", "M_ed_ratio_3544", "M_ed_ratio_4564", "Fm_ed_ratio_2534", "Fm_ed_ratio_3544", "Fm_ed_ratio_4564"];
//create dictionary to reference normalized column names
var attrDict = {"M_ed_ratio_2534": ["Males Age 25-34"], "M_ed_ratio_3544": ["Males Age 35-44"], "M_ed_ratio_4564": ["Males Age 45-64"], "Fm_ed_ratio_2534": ["Females Age 25-34"], "Fm_ed_ratio_3544": ["Females Age 35-44"], "Fm_ed_ratio_4564":["Females Age 45-64"]
};
//variable to be displayed
var expressed = attrArray[0]; 

//set chart dimension parameters
var chartWidth = window.innerWidth * .45
    chartHeight = 285,
    leftPadding = 28, 
    rightPadding = 2,
    topBottomPadding = 5,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

//set the y scale range and domain
var yScale = d3.scale.linear()
    .range([250, 0])
    .domain([0, 40]);

//call setMap function when the DOM is ready
window.onload = setMap();

//function to create map
function setMap(){
   
    //set dimension variables for map
    var width = window.innerWidth * 0.45;
        height = 300;
    
    //add the title of the map to the maptitle div and set properties
    var maptitletext = d3.select("#maptitle")
        .text("Ratio of Postsecondary Degrees to No High School Diplomas in Pennsylvania")
        .attr("class", "mapTitletext")
        .attr("margin", "8px");
    
    //append svg container that will contain the map to the mapchart div & set properties
    var map = d3.select("#mapchartdiv")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);
    
    //create the projection for the svg graphics
    var projection = d3.geo.conicEqualArea()
        .center([0, 37])
        .rotate([77.5, -4])
        .parallels([20, 42])
        .scale(6000)
        .translate([width/2, height/2])

    //create path generator to draw the feature geometry
    var path = d3.geo.path()
        .projection(projection);

    //load the data asynchronously in parallel
    d3.queue()
        .defer(d3.csv, "data/dataTable.csv")
        .defer(d3.json, "data/states.topojson")
        .defer(d3.json, "data/pa.topojson")
        .defer(d3.json, "data/counties.topojson")
        .await(callback);
    
    //set callback function
    function callback(error, csvData, states, paST, counties){
        //convert data to GeoJSON
        var USstates = topojson.feature(states, states.objects.NEstates),
            paState = topojson.feature(paST, paST.objects.pa),
            paCounties = topojson.feature(counties, counties.objects.pa_counties).features;

        //add states to map
        var states = map.append("path")
            .datum(USstates)
            .attr("class", "states")
            .attr("d", path);
        
        //add pennsylvania to map
        var pennsylvania = map.append("path")
            .datum(paState)
            .attr("class", "pa")
            .attr("d", path);

        //function calls that use callback data
        paCounties = joinData(paCounties, csvData);
                
        var colorScale = makeColorScale(csvData);

        setEnumerationUnits(paCounties, map, path, colorScale);
        
        setChart(csvData, colorScale);

        createDropdown(csvData, attrDict);
        
        dataTitle(csvData);

    };
};

//function to add map & chart title to map
function dataTitle(csvData){
    var title = d3.select("#attselector")
        .data(csvData)
        .append("text")
        .attr("class", "dataTitle")
        .text("Ratio of Post-Secondary Degrees to No High School Diplomas for " + attrDict[expressed][0] + " by County")
        .style("font-weight", "bold");

};

//function to create bar chart
function setChart(csvData, colorScale){
    
    //create svg object to add chart to
    var chart = d3.select("#mapchartdiv")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    //create chart background object
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
    
    //use the csvData to create the chart bars
    var bars = chart.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        //sort bars from largest to smallest
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
            return "bar " + d.area;
        })
        //set spacing for the bars 
        .attr("width", chartInnerWidth / csvData.length - 1)

        //call functions based on events
        .on("mouseover", highlight)
        .on("mouseout", dehighlight)
        .on("mousemove", moveLabel);

        //set current properties of baars to description property of svg
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

    //create axes of chart
    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient("left");
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //call update chart function to ensure currently selected attribute is displayed
    updateChart(bars, csvData.length, colorScale);

};


//set function to join geometry and attribute data from csv
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

//add counties to the map and symbolize using the created color scale
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
    //call functions on events
    .on("mouseover", function(d){
        highlight(d.properties);
    })
    .on("mouseout", function(d){
        dehighlight(d.properties);
    })
    .on("mousemove", moveLabel);
    //append current style to description attribute of svgs
    var desc = counties.append("desc")
        .text('{"fill-opacity": "1", "stroke": "#000", "stroke-width": "0.5px"}');
    
};

//create quantile color scale with 5 classes
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

// set error handling if value for color isnt a number
function choropleth(props, colorScale){
    var val = parseFloat(props[expressed]);
    if (typeof val == 'number' && !isNaN(val)){
        return colorScale(val);
    } else {
        return "#CCC";
    };
};

//create selector object to toggle visible attributes
function createDropdown(csvData, attrDict){
    var dropdown = d3.select("#attselector")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, csvData)
        });
    // set visual affordance in selector
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption") 
        .attr("disabled", "true") 
        .text("Select Gender & Age Range");
    //populate dropdown with attributes using the dictionary
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d})
        .text(function(d){
            return attrDict[d][0]
        });
};
//apply changes from dropdown to chart and map
function changeAttribute(attribute, csvData){
    expressed = attribute;
    //reapply the color ramp functions & display transitions for the new selected attribute
    var colorScale = makeColorScale(csvData);
    var counties = d3.selectAll(".counties")
        .transition()
        .duration(1000)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale)
        });
    //resort the bars based on the new attribute and add transition effects
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

//update chart based on newly selected attribute
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
    //update title based on new selected attribute
    var dataTitle = d3.select(".dataTitle")
        .text("Ratio of Post-Secondary Degrees to No High School Diplomas for " + attrDict[expressed][0] + " by County");
    

};

//set highlight function
function highlight(props){

    var selected = d3.selectAll("." + props.area) 
        .style("fill-opacity", "0")
        .style("stroke", "#313300")
        .style("stroke-width", "3")
        setLabel(props);
};
//set dehighlight function
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
    //retrieve old style from description property
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
//create labels
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
//set label positioning according to pointer position
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