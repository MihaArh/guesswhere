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
let poseNet;
let poses = [];
let initialNosePosition = {};
let lestNosePosition = {};
let line;

function setup() {
  loadLocations();
  getRandomLocation();
  initCamera();
  initSeriously();
  initPano();
  initMap();
  initPoses();
}

function draw() {
  chromaKey();
  trackPose();
}

function loadLocations() {
  $.ajaxSetup({
    async: false,
  });
  $.getJSON("locations.json", function (json) {
    locations = json;
  });
  $.ajaxSetup({
    async: true,
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
    draggableCursor: "crosshair",
    scrollwheel: true,
  });

  map.addListener("click", (mapsMouseEvent) => {
	let clickedCoords = mapsMouseEvent.latLng.toJSON();
	let dstn = getDistance(clickedCoords, realCoords);
    console.log(dstn);
    drawLines(clickedCoords, realCoords);
  });
}

function initPoses() {
  poseNet = ml5.poseNet(capture, function () {
    console.log("Model loaded.");
  });

  poseNet.on("pose", function (results) {
    poses = results;
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

function trackPose() {
  for (let i = 0; i < poses.length; i++) {
    let keypoint = poses[i].pose.keypoints[0];
    if (
      Object.keys(initialNosePosition).length === 0 &&
      initialNosePosition.constructor === Object
    ) {
      initialNosePosition = { x: keypoint.position.x, y: keypoint.position.y };
      lastNosePosition = { x: keypoint.position.x, y: keypoint.position.y };
    }

    let differenceX = initialNosePosition.x - keypoint.position.x;
    let differenceY = keypoint.position.y - initialNosePosition.y;
    if (
      Math.abs(lastNosePosition.x - initialNosePosition.x) > 5 ||
      Math.abs(lastNosePosition.y - initialNosePosition.y) > 3
    ) {
      let x = panorama.getPov().heading - differenceX / 100;
      let y = panorama.getPov().pitch - differenceY / 100;
      if (y < 90 && y > -90) {
        panorama.setPov({
          heading: x,
          pitch: y,
        });
      }
    }
    lastNosePosition = { x: keypoint.position.x, y: keypoint.position.y };
  }
}



function drawLines(clickedCoords, realCoords) {
  var lineSymbol = {
    path: "M 0,-1 0,1",
    strokeOpacity: 1,
    scale: 4,
  };

  if (line !== undefined) {
    removeLine();
  }
  line = new google.maps.Polyline({
    path: [
      new google.maps.LatLng(clickedCoords.lat, clickedCoords.lng),
      new google.maps.LatLng(realCoords.lat, realCoords.lng),
    ],
    icons: [{
        icon: lineSymbol,
        offset: '0',
        repeat: '20px'
      }],
    strokeOpacity: 0,
  });
  addLine();
}

function addLine() {
  line.setMap(map);
}

function removeLine() {
  line.setMap(null);
}

function rad(x) {
  return (x * Math.PI) / 180;
}

function getDistance(p1, p2) {
  console.log(p1);
  console.log(p2);
  var R = 6378137; // Earth’s mean radius in meter
  var dLat = rad(p2.lat - p1.lat);
  var dLong = rad(p2.lng - p1.lng);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(p1.lat)) *
      Math.cos(rad(p2.lat)) *
      Math.sin(dLong / 2) *
      Math.sin(dLong / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;
  return d; // returns the distance in meter
}
