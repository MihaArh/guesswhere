let canvas;
let capture;
let w = 640;
let h = 480;
let chroma;
let seriously;
let realCoords = { lat: 46.053274, lng: 14.470221 };
let locations = [];
let panorama;
let map;

function setup() {
  loadLocations();
  getRandomLocation();
  initCamera();
  initSeriously();
  initPano();
  initMap();
}

function draw() {
  chromaKey();
}

function loadLocations() {
  $.ajaxSetup({
    async: false,
  });
  $.getJSON("locations.json", function (json) {
    locations = json;
  });
  $.ajaxSetup({
    async: true
});
}

function getRandomLocation() {
  realCoords = locations[Math.floor(Math.random() * locations.length)];
}

function initCamera() {
  capture = createCapture(
    {
      audio: false,
      video: {
        width: { min: 320, ideal: 640, max: 640 },
        height: { min: 240, ideal: 480, max: 480 },
      },
    },
    function () {
      console.log("Camera capture ready.");
    }
  );
  capture.size(w, h);
  capture.id("p5video");
  capture.elt.setAttribute("playsinline", "");
  capture.hide();
}

function initSeriously() {
  seriously = new Seriously();

  var src = seriously.source("#p5video");
  var target = seriously.target("#p5canvas");

  chroma = seriously.effect("chroma");
  chroma.source = src;
  target.source = chroma;

  seriously.go();
}

function initPano() {
  panorama = new google.maps.StreetViewPanorama(
    document.getElementById("pano"),
    {
      position: realCoords,
      pov: {
        heading: 0,
        pitch: 0,
      },
      addressControl: false,
      showRoadLabels: false,
      panControl: false,
      visible: true,
    }
  );
  panorama.addListener("pano_changed", () => {
    console.log(panorama.getPano());
  });
  panorama.addListener("links_changed", () => {
    const links = panorama.getLinks();
    console.log(links);
  });
  panorama.addListener("position_changed", () => {
    realCoords = {
      lat: panorama.location.latLng.lat(),
      lng: panorama.location.latLng.lng(),
    };
    console.log(panorama.location.latLng.lat());
    console.log(panorama.location.latLng.lng());
  });
  panorama.addListener("pov_changed", () => {
    //DOL
    console.log("POV heading: " + panorama.getPov().heading);
    // GOR
    console.log("POV pitch: " + panorama.getPov().pitch);
  });
}

function initMap() {
	map = new google.maps.Map(document.getElementById("map"), {
		center: { lat: -34.397, lng: 150.644 },
		minZoom: 3,
		zoom: 3,
		maxZoom: 15,
		draggableCursor:'crosshair',
		scrollwheel: true,
	  });
	
	  map.addListener("click", (mapsMouseEvent) => {
		let clickedCoords = mapsMouseEvent.latLng.toJSON();
	  });
}

function chromaKey() {
  var r = 254 / 255;
  var g = 255 / 255;
  var b = 254 / 255;
  chroma.screen = [r, g, b];

  chroma.weight = 1;
  chroma.balance = 1;
  chroma.clipBlack = 1;
  chroma.clipWhite = 1;

  seriously.go();
}
