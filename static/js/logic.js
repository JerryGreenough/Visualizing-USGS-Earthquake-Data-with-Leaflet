
// Define the world light map and world satellite map layers.

var worldLightMap = L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
	attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors, <a href=\"https://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"https://www.mapbox.com/\">Mapbox</a>",
	maxZoom: 18,
	id: "mapbox.light",
	accessToken: API_KEY
});

var worldSatelliteMap = L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
	attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors, <a href=\"https://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"https://www.mapbox.com/\">Mapbox</a>",
	maxZoom: 18,
	id: "mapbox.satellite",
	accessToken: API_KEY
});

// Create the base map, giving it the satellite map tile layer to display on load.

var myMap = L.map("map", {
	center: [
	0.0, 0.0   // Centered in the middle of the Atlantic !
	],
	zoom: 3,
	layers: [worldLightMap]
});


tekQueryUrl = "https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_plates.json";

d3.json(tekQueryUrl, function(data) {	

     // Define the tectonics layer and add it to the leaflets map.
	 
	tecLayer = createTectonicsLayer(data);
	tecLayer.addTo(myMap);
	
	// The following URL will allow us to grab all magnitude 2.5+ earthquakes from around 
	// the world during the past 30 days.
	
	var queryUrl = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.geojson"
	
	var markerLayer;
	
	// Grab the earthquake data.
	
	d3.json(queryUrl, function(eqdata) {
		
		var mklist = [];
		
		// Loop through the earthquake data and create one marker for each earthquake event.
		
		for (var i = 0; i < eqdata.features.length; i++) {
			var xy = eqdata.features[i].geometry.coordinates;
			var coords = [xy[1], xy[0]];
			
			let latlng = L.latLng(xy[1], xy[0]);
		
			// Using the cicrleMarker and not the L.circle as leaflet does strange
			// things to circles at extreme Northern latitiudes (due to the non-linear
			// projection near the poles).
			
			xx = L.circleMarker(latlng, {
				fillOpacity: 1.0,
				color: "black",
				fillColor: markerColor(eqdata.features[i].properties.mag),
				weight: 1,
				radius: markerRadius(eqdata.features[i].properties.mag)})
			
			// Add some 'pop-up' / click-text.
			
			.bindPopup("<h3>" + eqdata.features[i].properties.place +
				"</h3><hr><p>" + new Date(eqdata.features[i].properties.time) + "</p>" +
				"<hr><p>" +	"Magnitude: " + (eqdata.features[i].properties.mag).toFixed(2) + "</p>");	
			
			mklist.push(xx);
			
		}
		
		markerLayer = L.layerGroup(mklist);
		markerLayer.addTo(myMap);
		
		// Create a legend using Richter Scale values from 2 to 10.

		var RichterScaleLegend = createLegend();

		// Add legend to the map.
	
		RichterScaleLegend.addTo(myMap);
		
		// Create overlay object to hold our overlay layers.
		
		var overlayMaps = {
		  "Markers": markerLayer, 
		  "Tectonix": tecLayer
		};
		
		var baseMaps = {
		  "Light Map": worldLightMap,
		  "Sateliite Map": worldSatelliteMap
		};

		// Create a layer control.
		// Pass in our baseMaps and overlayMaps.
		// Add the layer control to the map.
		  
		L.control.layers(baseMaps, overlayMaps, {
		    collapsed: false
		  }).addTo(myMap);
		
	});	
	
});


function createTectonicsLayer(data){
	var plist = [];
	
	for(var i =0; i<data.features.length; ++i){
		
		var coords = [];
		data.features[i].geometry.coordinates[0].forEach(x => {coords.push([x[1], x[0]]);});
		
		plist.push(	L.polygon( coords, {
			color: "white",
			fillColor: "none",
			fillOpacity: 0.75,
			name: "XXX",
			weight: 1
		}));
	}
	
	tecLayer = L.layerGroup(plist);
	
	return tecLayer;	
}

function markerRadius(mag){
	// Returns the radius, linearly interpolated between 2 and
	// 42 pixels.
	
	let r = 2.0 + (mag-2.0)*5.0;
	return Math.min(Math.max(r, 2.0),42.0);
}	

function markerColor(mag){
	// Returns a color (rgb string) that interpolates between
	// pale yellow and dark red using [2.0, 10.0] as the domain
	// values.
	
	let r = Math.min(Math.max(mag, 2.0),10.0);
	
	let alpha = (r - 2.0) / 8.0;
	alpha = Math.max(Math.min(alpha, 1.0),0.0);
	
	let rval = parseInt(255 - alpha * 116, 10);
	rval = Math.max(Math.min(rval, 255),0);
	let gval = parseInt(255 - alpha * 255, 10);
	gval = Math.max(Math.min(gval, 255),0);
	let bval = parseInt(0 - alpha * 0, 10);
	bval = Math.max(Math.min(bval, 255),0);

	return "rgb(" + rval + "," + gval + "," + bval + ")";		
}	

function createLegend(){
	// Create a legend using Richter Scale values from 2 to 10.
	
	var legend = L.control({ position: "bottomright" });
	legend.onAdd = function() {
		var div = L.DomUtil.create("div", "info legend");


		var limits = [2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0];
		var colors = [];
		var labels = [];
		
		limits.forEach(function(limit, index){
			colors.push(markerColor(limit));
		});		

		// Add min & max
		var legendInfo = "<h1>Earthquake Magnitude</h1>" +
        "<div class=\"min\">" + limits[0] + "</div>" +
        "<div class=\"max\">" + limits[limits.length - 1] + "</div>" +
		"</div>";

		div.innerHTML = legendInfo;

		limits.forEach(function(limit, index) {
		labels.push("<li style=\"background-color: " + colors[index] + "\"></li>");
		});

		div.innerHTML += "<ul>" + labels.join("") + "</ul>";
		return div;
	};
	
	return legend;
}



function setTecLayer(tl){
	tecLayer = tl;
	console.log("Here ... ", tl);
}



