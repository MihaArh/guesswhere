let realCoords = { lat: 46.053274, lng: 14.470221 };
let panorama;
let map;
let initialNosePosition = {};
let lastNosePosition = {};
let initialNoseLandmarks = {};
let line;
let selectedLocation = false;
let destinationMarker;
let clickedMarker;
let videoElement;
let canvasElement;
let controlsElement;
let canvasCtx;
let cameraLoaded = false;

let showCamera = true;
let showCameraLabels = true;

let selectedRegion = "all";
let selectedSubregion = "all";
let selectedCountry = "all";

let testRespons = {
    id: 23862,
    lat: 45.51657104,
    lng: 13.614371,
    formatted_address: "Lucan 18a, 6320 Portorož - Portorose, Slovenia",
    country: {
        id: 49,
        code: "SI",
        country: "Slovenia",
        capital: "Ljubljana",
        calling_code: "386",
        timezone: "UTC+01:00",
        currency_symbol: "€",
        population: 2064188,
        subregion: {
            id: 10,
            subregion: "Southern Europe",
            region: {
                id: 1,
                region: "Europe",
            },
        },
    },
};

let leftHand = {};
let rightHand = {};
let face = {};

function setup() {
    document.getElementById("defaultCanvas0").remove();
    videoElement = document.getElementsByClassName("input_video")[0];
    canvasElement = document.getElementById("p5canvas");
    controlsElement = document.getElementsByClassName("control-panel")[0];
    canvasCtx = canvasElement.getContext("2d");
    // initMotionTracking();
    getRandomLocation();
    initPano();
    initMap();
    initButtons();
    initSelections();
}

function draw() {}

function initMotionTracking() {
    cameraLoaded = true;
    function removeElementsExcept(landmarks, elements) {
        for (let i = 0; i < landmarks.length; i++) {
            if (!elements.includes(i)) {
                delete landmarks[i];
            }
        }
    }

    function onResults(results) {
        // Remove landmarks we don't want to draw.
        // removeLandmarks(results);

        // Draw the overlays.
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.drawImage(
            results.image,
            0,
            0,
            canvasElement.width,
            canvasElement.height
        );

        if (results.leftHandLandmarks) {
            leftHand = {
                wrist: results.leftHandLandmarks[0],
                thumb: results.leftHandLandmarks[4],
                index: results.leftHandLandmarks[8],
            };
        }
        if (results.rightHandLandmarks) {
            rightHand = {
                wrist: results.rightHandLandmarks[0],
                thumb: results.rightHandLandmarks[4],
                index: results.rightHandLandmarks[8],
            };
        }
        if (results.poseLandmarks) {
            removeElementsExcept(results.poseLandmarks, [0, 1, 4, 9, 10]);
            face = {
                mouth: {
                    x:
                        (results.poseLandmarks[10].x -
                            results.poseLandmarks[9].x) /
                        2,
                    y:
                        (results.poseLandmarks[10].y -
                            results.poseLandmarks[9].y) /
                        2,
                },
                nose: results.poseLandmarks[0],
                leftEye: results.poseLandmarks[1],
                rightEye: results.poseLandmarks[4],
            };
        }

        if (results.faceLandmarks) {
            removeElementsExcept(results.faceLandmarks, [1]);
            face["noseFace"] = results.faceLandmarks[1];
        }
        if (showCameraLabels) {
            // Hands...
            drawConnectors(
                canvasCtx,
                results.rightHandLandmarks,
                HAND_CONNECTIONS,
                { color: "#00CC00" }
            );
            drawLandmarks(canvasCtx, results.rightHandLandmarks, {
                color: "#00ff91",
                fillColor: "#0099ff",
            });
            drawConnectors(
                canvasCtx,
                results.leftHandLandmarks,
                HAND_CONNECTIONS,
                {
                    color: "#CC0000",
                }
            );
            drawLandmarks(canvasCtx, results.leftHandLandmarks, {
                color: "#FF0000",
                fillColor: "#00FF00",
            });

            // Face...
            drawLandmarks(canvasCtx, results.faceLandmarks, {
                color: "#C0C0C070",
                fillColor: "#FF0000",
                lineWidth: 1,
            });

            drawLandmarks(canvasCtx, [initialNoseLandmarks], {
                color: "#8CE519",
                fillColor: "#34BEF9",
                lineWidth: 1,
            });
        }

        canvasCtx.restore();
    }

    const holistic = new Holistic({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.1/${file}`;
        },
    });
    holistic.setOptions({
        upperBodyOnly: true,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
    });
    holistic.onResults(onResults);

    /**
     * Instantiate a camera. We'll feed each frame we receive into the solution.
     */
    const camera = new Camera(videoElement, {
        onFrame: async () => {
            leftHand = null;
            rightHand = null;
            face = null;
            await holistic.send({ image: videoElement });
            trackPose();
            checkZoomPose();
        },
        width: 1280,
        height: 720,
        selfie: true,
    });
    camera.start();
}

function getRandomLocation() {
    let url =
        `https://halibun.pythonanywhere.com/api/random/?region=${selectedRegion.replace(" ", "%20")}&subregion=${selectedSubregion.replace(" ", "%20")}&country=${selectedCountry.replace(" ", "%20")}&format=json`;

    console.log(url);
    $.ajax({
        url: url,
        type: "GET",
        success: function (res) {
            realCoords = { lat: res.lat, lng: res.lng };
        },
        async: false,
    });
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
            zoom: 1,
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
        // console.log(panorama.getPano());
    });
    panorama.addListener("links_changed", () => {
        const links = panorama.getLinks();
        // console.log(links);
    });
    panorama.addListener("position_changed", () => {
        realCoords = {
            lat: panorama.location.latLng.lat(),
            lng: panorama.location.latLng.lng(),
        };
        // console.log(panorama.location.latLng.lat());
        // console.log(panorama.location.latLng.lng());
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
        streetViewControl: false,
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

function initButtons() {
    $("#btn-settings").click(function () {
        $("#settings-modal").modal("toggle");
    });

    $("#btn-hint").click(function () {
        console.log("Hint");
    });

    $("#cameraSwitch").change(function () {
        if (this.checked) {
            $("#p5canvas").show("slow");
            $("#cameraLabelsSwitch").prop("disabled", false);
        } else {
            $("#p5canvas").hide("slow");
            $("#cameraLabelsSwitch").prop("disabled", true);
        }
        showCamera = this.checked;
    });

    $("#cameraLabelsSwitch").change(function () {
        showCameraLabels = this.checked;
    });

    $("#saveSettings").click(function(){
        console.log("Ha");
        showCamera = $("#cameraSwitch").checked;
        showCameraLabels = true;

        selectedRegion =$("#regionsSelect option:selected").val() == 0 ? "all" : $("#regionsSelect option:selected").text();
        selectedSubregion = $("#subregionsSelect option:selected").val() == 0 ? "all" : $("#subregionsSelect option:selected").text();
        selectedCountry = $("#countriesSelect option:selected").val() == 0 ? "all" : $("#countriesSelect option:selected").text();
        getRandomLocation();
        restartGame();
        console.log("Restart");
    });
}

function initSelections() {
    let regionsApiUrl =
        "https://halibun.pythonanywhere.com/api/regions/?ordering=region&sort=DESC";
    let subregionsApiUrl =
        "https://halibun.pythonanywhere.com/api/subregions/?ordering=subregion&sort=DESC";
    let countriesApiUrl =
        "https://halibun.pythonanywhere.com/api/countries/?ordering=country&sort=DESC";

    $.ajax({
        url: regionsApiUrl,
        type: "GET",
        success: function (res) {
            $.each(res, function (i, item) {
                $("#regionsSelect").append(
                    $("<option>", {
                        value: item.id,
                        text: item.region,
                    })
                );
            });
        },
        async: false,
    });

    $.ajax({
        url: subregionsApiUrl,
        type: "GET",
        success: function (res) {
            $.each(res, function (i, item) {
                $("#subregionsSelect").append(
                    $("<option>", {
                        value: item.id,
                        text: item.subregion,
                        region: item.region,
                    })
                );
            });
        },
        async: false,
    });

    $.ajax({
        url: countriesApiUrl,
        type: "GET",
        success: function (res) {
            $.each(res, function (i, item) {
                $("#countriesSelect").append(
                    $("<option>", {
                        value: item.id,
                        text: item.country,
                        subregion: item.subregion,
                    })
                );
            });
        },
        async: false,
    });


    $("#regionsSelect").change(function () {
        let subregions = $("#subregionsSelect option");
        let region_id = $(this).val();
        $("#subregionsSelect option").show();
        $("#countriesSelect option").show();
        $("#subregionsSelect").val(0);
        $("#countriesSelect").val(0);
        if (region_id != 0) {
            $("#subregionsSelect").val(0);
            let hiddenSubregions = [];
            $.each(subregions, function (i, item) {
                if ($(item).attr("region") != region_id && item.value != 0) {
                    $(
                        "#subregionsSelect option[value=" + $(this).val() + "]"
                    ).hide();
                    hiddenSubregions.push($(this).val());
                }
            });

            hiddenSubregions.forEach(function (subregionValue) {
                $(
                    "#countriesSelect option[subregion=" + subregionValue + "]"
                ).hide();
            });
        }
        
    });
    $("#subregionsSelect").change(function () {
        let subregion_id = $(this).val();
        $("#countriesSelect option").show();
        $("#countriesSelect").val(0);
        if (subregion_id != 0) {
            let region_id = $("#subregionsSelect option:selected").attr(
                "region"
            );
            $("#regionsSelect").val(region_id);
            $("#countriesSelect option").show();
            let countries = $("#countriesSelect option");
            $.each(countries, function (i, item) {
                if (
                    $(item).attr("subregion") != subregion_id &&
                    item.value != 0
                ) {
                    $(
                        "#countriesSelect option[value=" + $(item).val() + "]"
                    ).hide();
                }
            });
        } else {
            let region = $("#regionsSelect option:selected").val();
            if (region != 0) {
                $("#subregionsSelect").val(0);
                let hiddenSubregions = [];
                let subregions = $("#subregionsSelect option");
                $.each(subregions, function (i, item) {
                    if (
                        $(item).attr("region") != region &&
                        item.value != 0
                    ) {
                        $(
                            "#subregionsSelect option[value=" +
                                $(this).val() +
                                "]"
                        ).hide();
                        hiddenSubregions.push($(this).val());
                    }
                });

                hiddenSubregions.forEach(function (subregionValue) {
                    $(
                        "#countriesSelect option[subregion=" +
                            subregionValue +
                            "]"
                    ).hide();
                });
            }
        }
        
    });
    $("#countriesSelect").change(function () {
        $("#regionsSelect option").show();
        $("#subregionsSelect option").show();
        let country_id = $(this).val();
        if (country_id != 0) {
            let subregion_id = $("#countriesSelect option:selected").attr(
                "subregion"
            );
            $("#subregionsSelect").val(subregion_id);
            let region = $("#subregionsSelect option:selected").attr("region");
            $("#regionsSelect").val(region);
        }
        
    });
}

function getRegions(id) {}
function getSubregions() {}
function getCountries() {}

function trackPose() {
    if (!selectedLocation && face && face.noseFace) {
        let currentNoseX = face.noseFace.x;
        let currentNoseY = face.noseFace.y;
        if (
            Object.keys(initialNosePosition).length == 0 &&
            initialNosePosition.constructor === Object
        ) {
            initialNosePosition = {
                x: currentNoseX,
                y: currentNoseY,
            };

            initialNoseLandmarks = initialNosePosition;
            lastNosePosition = initialNosePosition;
        }

        let distanceFromInitial = dist(
            initialNosePosition.x,
            initialNosePosition.y,
            currentNoseX,
            currentNoseY
        );

        let differenceX = initialNosePosition.x - currentNoseX;
        let differenceY = initialNosePosition.y - currentNoseY;
        if (distanceFromInitial > 1 / 28) {
            let x = panorama.getPov().heading + differenceX * 4;
            let y = panorama.getPov().pitch + differenceY * 4;
            if (y < 90 && y > -90) {
                panorama.setPov({
                    heading: x,
                    pitch: y,
                });
            }
        }
        lastNosePosition = {
            x: currentNoseX,
            y: currentNoseY,
        };
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
    if (line){
        line.setMap(null);
    }
}

function removeMapNotations() {
    removeLine();
    removeMarkers();
}
function removeMarkers() {
    if (destinationMarker && clickedMarker){
        destinationMarker.setMap(null);
        clickedMarker.setMap(null);
    }
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

function checkZoomPose() {
    if (face && leftHand && rightHand) {
        let treshold = 0.07;
        // debugger

        let distHandLeft = dist(
            leftHand.index.x,
            leftHand.index.y,
            leftHand.thumb.x,
            leftHand.thumb.y
        );
        let distHandRight = dist(
            rightHand.index.x,
            rightHand.index.y,
            rightHand.thumb.x,
            rightHand.thumb.y
        );

        let rightThumbToNose = dist(
            rightHand.thumb.x,
            rightHand.thumb.y,
            face.rightEye.x,
            face.rightEye.y
        );
        let leftThumbToNose = dist(
            leftHand.thumb.x,
            leftHand.thumb.y,
            face.leftEye.x,
            face.leftEye.y
        );
        if (
            distHandLeft < treshold &&
            distHandRight < treshold &&
            rightThumbToNose < treshold &&
            leftThumbToNose < treshold
        ) {
            panorama.setZoom(3);
        } else {
            panorama.setZoom(1);
        }
    } else {
        panorama.setZoom(1);
    }
}
