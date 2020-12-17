let canvas;
let capture;
let w = 512;
let h = 384;
let realCoords = { lat: 46.053274, lng: 14.470221 };
let locations = [];
let panorama;
let map;
let poseNet;
let poses = [];
let initialNosePosition = {};
let lastNosePosition = {};
let line;
let selectedLocation = false;
let destinationMarker;
let clickedMarker;

function setup() {
    getRandomLocation();
    initCamera();
    initPano();
    initMap();
    initPoses();
}

function draw() {
    trackPose();
}

function getRandomLocation() {
    let url =
        "http://halibun.pythonanywhere.com/api/random/?region=all&subregion=all&country=all&format=json";
    $.ajax({
        url: url,
        type: "GET",
        success: function (res) {
            realCoords = { lat: res.lat, lng: res.lng };
        },
        async: false,
    });
}

function initCamera() {
    capture = createCapture(
        {
            audio: false,
            video: {
                width: { min: 320, ideal: w, max: w },
                height: { min: 240, ideal: h, max: h },
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
            clickToGo: false,
            scrollwheel: false,
            linksControl: false,
            panControl: false,
            draggable: false,
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
        // console.log("POV heading: " + panorama.getPov().heading);
        // GOR
        // console.log("POV pitch: " + panorama.getPov().pitch);
    });
}

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: -34.397, lng: 150.644 },
        minZoom: 2,
        zoom: 2,
        maxZoom: 15,
        draggableCursor: "crosshair",
        scrollwheel: true,
    });

    map.addListener("click", (mapsMouseEvent) => {
        if (!selectedLocation) {
            selectedLocation = true;
            let clickedCoords = mapsMouseEvent.latLng.toJSON();
            let dstn = getDistance(clickedCoords, realCoords);
            drawMarkers(clickedCoords, realCoords);
            drawLines(clickedCoords, realCoords);
            var latlngbounds = new google.maps.LatLngBounds();
            latlngbounds.extend(clickedCoords);
            latlngbounds.extend(realCoords);
            map.fitBounds(latlngbounds);

            showScore(dstn);
            $("#restartGame").click(function () {
                restartGame();
            });
        }
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

function trackPose() {
    if (!selectedLocation) {
        for (let i = 0; i < poses.length; i++) {
            let keypoint = poses[i].pose.keypoints[0];
            if (
                Object.keys(initialNosePosition).length === 0 &&
                initialNosePosition.constructor === Object
            ) {
                initialNosePosition = {
                    x: keypoint.position.x,
                    y: keypoint.position.y,
                };
                lastNosePosition = {
                    x: keypoint.position.x,
                    y: keypoint.position.y,
                };
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
            lastNosePosition = {
                x: keypoint.position.x,
                y: keypoint.position.y,
            };
        }
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
        icons: [
            {
                icon: lineSymbol,
                offset: "0",
                repeat: "20px",
            },
        ],
        strokeOpacity: 0,
    });
    addLine();
}

function drawMarkers(clickedCoords, realCoords) {
    var destinationIcon = {
        url: "assets/destination.svg",
        anchor: new google.maps.Point(25, 50),
        scaledSize: new google.maps.Size(50, 50),
    };

    destinationMarker = new google.maps.Marker({
        position: realCoords,
        map: map,
        draggable: false,
        icon: destinationIcon,
        zIndex: -20,
    });

    var clickedIcon = {
        url: "assets/man.svg",
        anchor: new google.maps.Point(25, 50),
        scaledSize: new google.maps.Size(50, 50),
    };

    clickedMarker = new google.maps.Marker({
        position: clickedCoords,
        map: map,
        draggable: false,
        icon: clickedIcon,
        zIndex: -20,
    });
}

function addLine() {
    line.setMap(map);
}

function removeLine() {
    line.setMap(null);
}

function removeMapNotations() {
    removeLine();
    removeMarkers();
}
function removeMarkers() {
    destinationMarker.setMap(null);
    clickedMarker.setMap(null);
}
function rad(x) {
    return (x * Math.PI) / 180;
}

function getDistance(p1, p2) {
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

function showScore(distance) {
    let score = kFormatter(Math.floor(distance));
    $("#myModal #score").text(score);
    $("#myModal").modal("show");
}

function kFormatter(num) {
    return Math.abs(num) > 999
        ? Math.sign(num) * (Math.abs(num) / 1000).toFixed(1) + " km"
        : Math.sign(num) * Math.abs(num) + " m";
}

function restartGame() {
    $("#myModal").modal("hide");
    removeMapNotations();
    getRandomLocation();
    panorama.setPosition(realCoords);
    initialNosePosition = {};
    selectedLocation = false;
}
