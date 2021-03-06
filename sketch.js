let realCoords = { lat: 46.053274, lng: 14.470221 };
let panorama;
let map;
let scoreMap;
let initialNosePosition = {};
let lastNosePosition = {};
let initialNoseLandmarks = {};
let line;
let lineScoreMap;
let selectedLocation = false;
let destinationMarker;
let clickedMarker;
let videoElement;
let canvasElement;
let controlsElement;
let canvasCtx;
let cameraLoaded = false;
let locationData = null;
let weatherData = null;
let showCamera = true;
let showCameraLabels = false;
let selectedRegion = "all";
let selectedSubregion = "all";
let selectedCountry = "all";
let isLoaded = false;
let hints = new Set();
let usedHints = [];
let leftHand = {};
let rightHand = {};
let face = {};
let stopAnimation = false;
let weatherSketch = null;
let maxScoreWorld = 20000;
let maxScore = 20000;
let initialHeading = 0;
let initialPitch = 0;
let baseApiUrl = "https://halibun.pythonanywhere.com/api";
let cameraRotationSpeed = 13;
let initialCameraRotationSpeed = 13;
let settingsModalOpen = false;
let username = null;
let finalScore = null;
const fpsControl = new FPS();
let seenLocations = [];

function setup() {
    document.getElementById("defaultCanvas0").remove();
    videoElement = document.getElementsByClassName("input_video")[0];
    canvasElement = document.getElementById("p5canvas");
    controlsElement = document.getElementsByClassName("control-panel")[0];
    canvasCtx = canvasElement.getContext("2d");
    initMotionTracking();
    funFact();
    getRandomLocation();
    initPano();
    initMap();
    initButtons();
    initSelections();
}

function draw() {}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function hideLoadingScreen() {
    $("#funFact").removeClass("animate__backInLeft");
    $("#funFact").addClass("animate__backOutLeft");
    $(".loading").fadeOut("2000");
    if(isLoaded && !username){
        $("#usernameModal").modal("show");
    }
}

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
        isLoaded = true;
        fpsControl.tick();
        hideLoadingScreen();
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
            drawLandmarks(canvasCtx, results.rightHandLandmarks, {
                color: "#00ff91",
                fillColor: "#0099ff",
            });

            drawLandmarks(canvasCtx, results.leftHandLandmarks, {
                color: "#FF0000",
                fillColor: "#00FF00",
            });

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
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
    });
    holistic.onResults(onResults);

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

    new ControlPanel(controlsElement, {}).add([fpsControl]).on((options) => {
        holistic.setOptions(options);
    });
}

function getRandomLocation() {
    let region = selectedRegion.replace(" ", "%20");
    let subregion = selectedSubregion.replace(" ", "%20");
    let country = selectedCountry.replace(" ", "%20");
    let url = `${baseApiUrl}/random/?region=${region}&subregion=${subregion}&country=${country}&format=json`;
    $.ajax({
        url: url,
        type: "GET",
        success: function (res) {
            if (seenLocations.includes(res.id)){
                getRandomLocation();
            } else {
                if (seenLocations.length >= 20){
                    seenLocations.shift();
                }
                seenLocations.push(res.id);
                locationData = res;
                realCoords = { lat: res.lat, lng: res.lng };
                let country = res.country;
                if (selectedCountry == "all"){
                    hints.add({ capital: country.capital });
                    hints.add({ calling_code: country.calling_code });
                    hints.add({ currency_symbol: country.currency_symbol });
                    hints.add({ population: country.population });
                }                
                hints.add({ post_code: res.postal_code });
                let capitalCoords = {
                    lat: country.capital_lat, lng: country.capital_lng
                }
                hints.add({ capital_distance: kmFormatter(getDistance(realCoords, capitalCoords)) });
                hints.add({ direction: getDirection(realCoords, capitalCoords)})
                getWeather(realCoords.lat, realCoords.lng);
            }
        },
        async: false,
    });
}

function getDirection(realCoords, capitalCoords){
    let direction = "";
    if (realCoords.lat > capitalCoords.lat) direction += "north "
    else direction += "south "

    if (realCoords.lng > capitalCoords.lng) direction += "east"
    else direction += "west"

    return direction;

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
            fullscreenControl: false,
            zoomControl: false,
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
        center: { lat: 45, lng: 0 },
        minZoom: 2,
        zoom: 2,
        maxZoom: 15,
        draggableCursor: "crosshair",
        scrollwheel: true,
        streetViewControl: false,
    });

    map.addListener("click", (mapsMouseEvent) => {
        if (!selectedLocation) {
            initScoreMap();
            selectedLocation = true;
            let clickedCoords = mapsMouseEvent.latLng.toJSON();
            let dstn = getDistance(clickedCoords, realCoords);
            drawMarkers(clickedCoords, realCoords);
            drawLines(clickedCoords, realCoords);
            var latlngbounds = new google.maps.LatLngBounds();
            latlngbounds.extend(clickedCoords);
            latlngbounds.extend(realCoords);
            scoreMap.fitBounds(latlngbounds);
            showScore(dstn);
        }
    });
}

function getHint() {
    $("#hint-row").addClass("hint-overlay");
    $("#btn-hint").prop("disabled", true);
    if (hints.size > 0) {
        let items = Array.from(hints);
        const randomElement = items[Math.floor(Math.random() * items.length)];
        let hintMessage = "";
        let saveHint = true;
        switch (Object.keys(randomElement)[0]) {
            case "capital":
                let capital = randomElement.capital;
                let charsToRemove = Math.floor(capital.length / 2);
                let capitalArray = capital.split("");
                hintMessage = `Capital of this country is ${getRandomUnderscores(
                    capitalArray,
                    charsToRemove
                )}.`;
                break;
            case "calling_code":
                hintMessage = `The calling code of this country is +${randomElement.calling_code}.`;
                break;
            case "currency_symbol":
                hintMessage = `${randomElement.currency_symbol} is the currency symbol here.`;
                break;
            case "population":
                var populationDots = randomElement.population
                    .toString()
                    .replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1.");
                hintMessage = `There are ${populationDots} people in this country.`;
                break;
            case "temperature":
                let temperature = randomElement.temperature
                    .toString()
                    .split(".")[0];
                if (temperature == "-0") temperature = "0";
                hintMessage = `Current temperature here is ${temperature} °C.`;
                break;
            case "weather":
                saveHint = false;
                hintMessage = `This is the current weather here.`;
                showWeather(randomElement.weather);
                break;
            case "timezone":
                let zoneHours = randomElement.timezone / 3600; // seconds to hours
                var currentTime = new Date();
                var milliseconds = new Date(
                    currentTime.setHours(currentTime.getUTCHours() + zoneHours)
                );
                let timeFormated = milliseconds.toTimeString().substring(0, 5);
                hintMessage = `Local time here is ${timeFormated}.`;
                break;
            case "capital_distance":
                let capital_distance = randomElement.capital_distance
                hintMessage = `We are ${capital_distance} away from capital.`;
                break
            case "post_code":
                let post_code = randomElement.post_code
                hintMessage = `Post code here is ${post_code}.`;
                break
            case "direction":
                let direction = randomElement.direction
                hintMessage = `We are ${direction} from capital.`;
                break
        }

        $("#hint").removeClass("animate__backOutLeft");
        $("#hint").text(hintMessage);
        $("#hint").addClass("animate__backInLeft");
        setTimeout(function () {
            $("#hint")
                .removeClass("animate__backInleft")
                .addClass("animate__backOutLeft");
            $("#btn-hint").prop("disabled", false);
            $("#hint-row").removeClass("hint-overlay");

            if (saveHint) {
                const newDiv = document.createElement("li");
                $(newDiv).addClass("list-group-item");
                $(newDiv).text(hintMessage);
                $("#hint-list").append(newDiv);
            }
        }, 4000);
        usedHints.push(randomElement);
        items.splice(items.indexOf(randomElement), 1);
        hints = new Set(items);
    } else {
        $("#no-hints").removeClass("animate__backOutLeft");
        $("#no-hints").text("You have used all available hints :(");
        $("#no-hints").addClass("animate__backInLeft");
        setTimeout(function () {
            $("#no-hints")
                .removeClass("animate__backInleft")
                .addClass("animate__backOutLeft");
            $("#btn-hint").prop("disabled", false);
            $("#hint-row").removeClass("hint-overlay");
        }, 4000);
    }
}

function getRandomUnderscores(splitted, n) {
    var count = 0;
    while (count < n) {
        var index = Math.floor(Math.random() * splitted.length);
        if (splitted[index] !== "_" && splitted[index] !== " ") {
            splitted[index] = "_";
            count++;
        }
    }

    return splitted.join("");
}

function showWeather(condition) {
    switch (condition) {
        case "Thunderstorm":
            animateRain();
            animateThunder();
            break;
        case "Drizzle":
            animateRain();
            break;
        case "Rain":
            animateRain();
            break;
        case "Snow":
            animateSnow();
            break;
        case "Clear":
            animateSun();
            break;
        case "Clouds":
            animateCloud();
            break;
        default:
            animateFog();
            break;
    }
}
function animateRain() {
    stopAnimation = false;
    new p5(rainAnimation, "p5sketch");
    setTimeout(function () {
        stopAnimation = true;
    }, 4000);
}
function animateSun() {
    stopAnimation = false;
    new p5(sunAnimation, "p5sketch");
    setTimeout(function () {
        stopAnimation = true;
    }, 4000);
}
function animateSnow() {
    stopAnimation = false;
    new p5(snowAnimation, "p5sketch");
    setTimeout(function () {
        stopAnimation = true;
    }, 4000);
}
function animateCloud() {
    new p5(cloudsAnimation, "p5sketch");
}
function animateFog() {
    stopAnimation = false;
    new p5(fogAnimation, "p5sketch");
    setTimeout(function () {
        stopAnimation = true;
    }, 4000);
}
function animateThunder() {
    stopAnimation = false;
    new p5(thunderAnimation, "p5sketch");
    setTimeout(function () {
        stopAnimation = true;
    }, 4000);
}

var rainAnimation = function (sketch) {
    let raindrops = [];
    weatherSketch = sketch;
    sketch.setup = function () {
        let canvas1 = sketch.createCanvas(
            windowWidth,
            windowHeight,
            sketch.P2D
        );
        canvas1.position(0, 0);
        for (i = 0; i < 100; i++) {
            raindrops[i] = new Rain(sketch);
        }
    };
    sketch.draw = function () {
        sketch.clear();
        for (i = 0; i < raindrops.length; i++) {
            if (raindrops[i].opacity < 0 && stopAnimation) {
                raindrops.splice(i, 1);
            } else {
                if (raindrops[i].opacity < 0) {
                    raindrops[i].y = random(0, -100);
                    raindrops[i].length = 15;
                    raindrops[i].r = 0;
                    raindrops[i].opacity = 200;
                }
                raindrops[i].dropRain();
                raindrops[i].splash();
            }
        }
        if (raindrops.length <= 0) {
            sketch.remove();
        }
    };
    sketch.windowResized = function () {
        resizeCanvas(windowWidth, windowHeight);
    };
};

var snowAnimation = function (sketch) {
    let snow;
    let snows = [];
    let snowNum = 500;
    weatherSketch = sketch;
    sketch.setup = function () {
        let canvas1 = sketch.createCanvas(
            windowWidth,
            windowHeight,
            sketch.P2D
        );
        canvas1.position(0, 0);
        snow = new Snow(sketch);
        for (let i = 0; i < snowNum; i++) {
            let snow = new Snow(sketch);
            snows.push(snow);
        }
    };
    sketch.draw = function () {
        sketch.clear();
        snow.display();
        snow.descend();
        snow.update();
        for (let i = 0; i < snows.length; i++) {
            if (snows[i].y > windowHeight && stopAnimation) {
                snows.splice(i, 1);
            } else {
                if (snows[i].y > windowHeight) {
                    snows[i].y = 0;
                }
                snows[i].display(0, 0);
                snows[i].update();
            }
        }
        if (snows.length <= 0) {
            sketch.remove();
        }
    };
    sketch.windowResized = function () {
        resizeCanvas(windowWidth, windowHeight);
    };
};

var cloudsAnimation = function (sketch) {
    let clouds = [];
    let cloudsNum = 10;
    weatherSketch = sketch;
    sketch.setup = function () {
        let canvas1 = sketch.createCanvas(
            windowWidth,
            windowHeight,
            sketch.P2D
        );
        canvas1.position(0, 0);
        for (let i = 0; i < cloudsNum; i++) {
            let cloud = new Cloud(sketch);
            clouds.push(cloud);
        }
    };
    sketch.draw = function () {
        sketch.clear();
        for (var i = 0; i < clouds.length; i++) {
            if (clouds[i].x > windowWidth) {
                clouds.splice(i, 1);
            } else {
                clouds[i].move();
                clouds[i].display();
            }
        }
        if (clouds.length <= 0) {
            sketch.remove();
        }
    };
    sketch.windowResized = function () {
        resizeCanvas(windowWidth, windowHeight);
    };
};

var sunAnimation = function (sketch) {
    let sun;
    weatherSketch = sketch;
    sketch.setup = function () {
        let canvas1 = sketch.createCanvas(
            windowWidth,
            windowHeight,
            sketch.P2D
        );
        canvas1.position(0, 0);
        sun = new Sun(sketch);
    };
    sketch.draw = function () {
        sketch.clear();
        if (!stopAnimation) {
            sun.shine();
        } else {
            sketch.remove();
        }
    };
    sketch.windowResized = function () {
        resizeCanvas(windowWidth, windowHeight);
    };
};

var thunderAnimation = function (sketch) {
    var xCoord1 = 0;
    var yCoord1 = 0;
    var xCoord2 = 0;
    var yCoord2 = 0;
    weatherSketch = sketch;
    sketch.setup = function () {
        let canvas1 = sketch.createCanvas(
            windowWidth,
            windowHeight,
            sketch.P2D
        );
        canvas1.position(0, 0);
        xCoord2 = random(windowWidth * 0.1, windowWidth - windowWidth * 0.1);
        yCoord2 = 0;
    };
    sketch.draw = function () {
        if (stopAnimation) {
            sketch.remove();
        } else {
            if (random(0.0, 1.0) < 0.1) {
                for (var i = 0; i < 20; i++) {
                    xCoord1 = xCoord2;
                    yCoord1 = yCoord2;
                    xCoord2 = xCoord1 + int(random(-20, 20));
                    yCoord2 = yCoord1 + int(random(0, 20));
                    sketch.strokeWeight(random(1, 3));
                    sketch.strokeJoin(MITER);
                    sketch.line(xCoord1, yCoord1, xCoord2, yCoord2);

                    if (
                        (xCoord2 > windowWidth) |
                        (xCoord2 < 0) |
                        (yCoord2 > windowHeight) |
                        (yCoord2 < 0)
                    ) {
                        sketch.clear();
                        xCoord2 = int(random(0, windowWidth));
                        yCoord2 = 0;
                        sketch.stroke(255, 255, random(0, 255));
                    }
                }
            }
        }
    };
    sketch.windowResized = function () {
        resizeCanvas(windowWidth, windowHeight);
    };
};

var fogAnimation = function (sketch) {
    let fogs = [];
    let fogsNum = 50;
    weatherSketch = sketch;
    sketch.setup = function () {
        let canvas1 = sketch.createCanvas(
            windowWidth,
            windowHeight,
            sketch.P2D
        );
        canvas1.position(0, 0);
        for (let i = 0; i < fogsNum; i++) {
            let fog = new Fog(sketch);
            fogs.push(fog);
        }
    };
    sketch.draw = function () {
        sketch.clear();
        for (var i = 0; i < fogs.length; i++) {
            if (fogs[i].y1 > windowWidth) {
                fogs.splice(i, 1);
            } else {
                fogs[i].paint();
                fogs[i].update();
            }
        }
        if (fogs.length <= 0) {
            sketch.remove();
        }
    };
    sketch.windowResized = function () {
        resizeCanvas(windowWidth, windowHeight);
    };
};

function initButtons() {
    $("#btn-settings").click(function () {
        $("#settings-modal").modal("toggle");
        $("#cameraRotationSpeedValue").text(` ${initialCameraRotationSpeed}x`);
        $("#cameraRotationSpeed").val(initialCameraRotationSpeed);
        cameraRotationSpeed = initialCameraRotationSpeed;
    });

    $("#btn-hint").click(function () {
        getHint();
    });

    $("#btn-restart").click(function () {
        restartGame();
    });

    $("#cameraSwitch").prop("checked", showCamera);
    $("#cameraLabelsSwitch").prop("checked", showCameraLabels);

    $("#cameraRotationSpeed").val(cameraRotationSpeed);
    $("#cameraRotationSpeedValue").text(` ${cameraRotationSpeed}x`);

    $("#cameraSwitch").change(function () {
        if (this.checked) {
            $("#cameraLabelsSwitch").prop("disabled", false);
        } else {
            $("#cameraLabelsSwitch").prop("disabled", true);
        }
    });

    $("#cameraRotationSpeed").change(function () {
        cameraRotationSpeed = $(this).val();

        $("#cameraRotationSpeedValue").text(` ${cameraRotationSpeed}x`);
    });

    $("#saveSettings").click(function () {
        showCamera = $("#cameraSwitch").prop("checked");
        initialCameraRotationSpeed = cameraRotationSpeed;
        if (showCamera) {
            $("#p5canvas").show("slow");
            $("#cameraLabelsSwitch").prop("disabled", false);
        } else {
            $("#p5canvas").hide("slow");
            $("#cameraLabelsSwitch").prop("disabled", true);
        }

        showCameraLabels = $("#cameraLabelsSwitch").prop("checked");

        let prevRegion = selectedRegion;
        let prevSubregion = selectedSubregion;
        let prevCountry = selectedCountry;

        selectedRegion =
            $("#regionsSelect option:selected").val() == 0
                ? "all"
                : $("#regionsSelect option:selected").text();
        selectedSubregion =
            $("#subregionsSelect option:selected").val() == 0
                ? "all"
                : $("#subregionsSelect option:selected").text();
        selectedCountry =
            $("#countriesSelect option:selected").val() == 0
                ? "all"
                : $("#countriesSelect option:selected").text();
        if (
            prevRegion != selectedRegion ||
            prevSubregion != selectedSubregion ||
            prevCountry != selectedCountry
        ) {
            restartGame();
        }
    });

    $("#btn-reset-nose").click(function () {
        initialNosePosition = {};
    });

    $("#username").keyup(function (e) {
        username = $(this).val();
        if (username != "") {
            $("#setUsernameBtn").prop("disabled", false);
        } else {
            $("#setUsernameBtn").prop("disabled", true);
        }
        if (username != "" && (e.key === 'Enter' || e.keyCode === 13)) {
            $("#usernameModal").modal("hide");
        }
    });

    $("#setUsernameBtn").click(function () {
        $("#usernameModal").modal("hide");
    });   

}

function initSelections() {
    let regionsApiUrl = `${baseApiUrl}/regions/?ordering=region&sort=DESC`;
    let subregionsApiUrl = `${baseApiUrl}/subregions/?ordering=subregion&sort=DESC`;
    let countriesApiUrl = `${baseApiUrl}/countries/?ordering=country&sort=DESC`;

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
                    if ($(item).attr("region") != region && item.value != 0) {
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

function trackPose() {
    if (!selectedLocation && face && face.noseFace && username && username != "") {
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
        let rotationSpeed = initialCameraRotationSpeed;
        if ($("#settings-modal").attr("aria-modal")) {
            rotationSpeed = cameraRotationSpeed;
        }
        if (distanceFromInitial > 1 / 28) {
            let x = panorama.getPov().heading + differenceX * rotationSpeed;
            let y = panorama.getPov().pitch + differenceY * rotationSpeed;
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

    if (lineScoreMap !== undefined) {
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

    lineScoreMap = new google.maps.Polyline({
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
        map: scoreMap,
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
        map: scoreMap,
        draggable: false,
        icon: clickedIcon,
        zIndex: -20,
    });
}

function addLine() {
    lineScoreMap.setMap(scoreMap);
}

function removeLine() {
    if (lineScoreMap) {
        lineScoreMap.setMap(null);
    }
}

function removeMapNotations() {
    removeLine();
    removeMarkers();
}
function removeMarkers() {
    if (destinationMarker && clickedMarker) {
        destinationMarker.setMap(null);
        clickedMarker.setMap(null);
    }
}
function rad(x) {
    return (x * Math.PI) / 180;
}

function getDistance(p1, p2) {
    var R = 6378137;
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
    return d;
}

function showScore(distance) {
    let distanceInKm = kmFormatter(Math.floor(distance));
    let score = calculateScore(distance);

    let locationName = `${weatherData.name}, ${locationData.country.country}`;

    $("#score-modal #city").text(`${locationName}`);
    $("#score-modal #distance").text(`${distanceInKm}`);
    $("#score-modal #hints").text(
        `${usedHints.length} ${usedHints.length == 1 ? " hint" : " hints"}`
    );
    $("#score-modal #score").text(score);

    $("#restart-game").click(function () {
        restartGame();
    });

    sendScore(score);
    $("#score-modal").modal("show");
}

function calculateScore(distance) {
    let score = maxScoreWorld - distance / 1000;
    let hintsDeducation = 500 * usedHints.length;
    score -= hintsDeducation;
    score = Math.floor(score);
    $("#score").text(`${score} / ${maxScoreWorld}`);
    $("#score-progress-bar").attr("aria-valuemax", maxScoreWorld);
    for (let i = 0; i < score; i++) {
        $("#score-progress-bar")
            .css("width", (i / maxScoreWorld) * 100 + "%")
            .attr("aria-valuenow", i);
    }
    finalScore = score;
}

function initScoreMap() {
    scoreMap = new google.maps.Map(document.getElementById("score-map"), {
        center: { lat: 45, lng: 0 },
        minZoom: 2,
        zoom: 2,
        maxZoom: 15,
        draggableCursor: "crosshair",
        scrollwheel: true,
        streetViewControl: false,
    });
}

function kmFormatter(num) {
    return Math.abs(num) > 999
        ? Math.sign(num) * (Math.abs(num) / 1000).toFixed(1) + " km"
        : Math.sign(num) * Math.abs(num) + " m";
}

function restartGame() {
    hints = new Set();
    finalScore = null;
    usedHints = [];
    $("#sendScore").prop("disabled", false);
    $("#hint-list").empty();
    if (weatherSketch) weatherSketch.remove();
    initialNosePosition = {};
    selectedLocation = false;
    $("#score-modal").modal("hide");
    removeMapNotations();
    getRandomLocation();
    panorama.setPosition(realCoords);
    panorama.setPov({
        heading: 0,
        pitch: 0,
    });
    map.setZoom(2);
}

function checkZoomPose() {
    if (leftHand && rightHand) {
        let treshold = 0.3;

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

        if (distHandLeft > treshold && distHandRight > treshold) {
            panorama.setZoom(3);
        } else {
            panorama.setZoom(1);
        }
    } else {
        panorama.setZoom(1);
    }
}

function funFact() {
    let url = `${baseApiUrl}/random/`;
    $.ajax({
        url: url,
        type: "GET",
        success: function (res) {
            let country = res.country;
            let facts = [
                { capital: country.capital },
                { calling_code: country.calling_code },
                { currency_symbol: country.currency_symbol },
                { population: country.population },
            ];

            const randomElement =
                facts[Math.floor(Math.random() * facts.length)];
            switch (Object.keys(randomElement)[0]) {
                case "capital":
                    $("#funFact").text(
                        `Did you know that capital of ${country.country} is ${randomElement.capital}?`
                    );
                    break;
                case "calling_code":
                    $("#funFact").text(
                        `Did you know that the calling code of ${country.country} is +${randomElement.calling_code}?`
                    );
                    break;
                case "currency_symbol":
                    $("#funFact").text(
                        `Did you know that the currency symbol of ${country.country} is ${randomElement.currency_symbol}?`
                    );
                    break;
                case "population":
                    var populationDots = randomElement.population
                        .toString()
                        .replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1.");
                    $("#funFact").text(
                        `Did you know that the population of ${country.country} is ${populationDots}?`
                    );
                    break;
            }
            $("#funFact").addClass("animate__backInLeft");
        },
        async: false,
    });
}

function getWeather(lat, lng) {
    let url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=9de243494c0b295cca9337e1e96b00e2`;
    $.ajax({
        url: url,
        type: "GET",
        success: function (res) {
            try {
                weatherData = res;
                hints.add({ weather: res.weather[0].main });
                hints.add({ temperature: res.main.temp });
                hints.add({ timezone: res.timezone });
            } catch (e) {}
        },
        async: false,
    });
}

function sendScore() {
    let url = `${baseApiUrl}/scoreboard/`;
    let difficulty = "all";
    if (selectedCountry != "all") {
        difficulty = selectedCountry;
    } else if (selectedSubregion != "all") {
        difficulty = selectedSubregion;
    } else if (selectedRegion != "all") {
        difficulty = selectedRegion;
    }
    let data = {
        username: username,
        score: finalScore,
        difficulty: difficulty,
    };
    $.ajax({
        url: url,
        type: "POST",
        data: data,
        success: function (res) {
            fetchScoreBoard(res);
        },
        async: false,
    });
}

function fetchScoreBoard(user = null) {
    let difficulty = "all";
    if (selectedCountry != "all") {
        difficulty = selectedCountry;
    } else if (selectedSubregion != "all") {
        difficulty = selectedSubregion;
    } else if (selectedRegion != "all") {
        difficulty = selectedRegion;
    }
    let title = difficulty;
    if (title == "all") {
        title = "World";
    }
    $("#scoreboardTitle").text(`${title} Scoreboard`);
    difficulty = difficulty.replace(" ", "%20");
    let url = `${baseApiUrl}/scoreboard/?ordering=-score&difficulty=${difficulty}`;
    $.ajax({
        url: url,
        type: "GET",
        success: function (res) {
            addToScoreboard(res, user);
        },
        async: false,
    });
}

function addToScoreboard(res, user = null) {
    let extend = res.length > 10;
    let foundUser = false;

    $("#scoreboardTable tbody").empty();

    for (index = 0; index < res.length; index++) {
        let item = res[index];
        let data = {
            position: index + 1,
            username: item.username,
            score: item.score,
            mark: user && item.id == user.id,
        };

        if (index == 10 && extend) {
            extendedRow();
        }
        if (index > 10 && (user == null || foundUser)) {
            break;
        }
        if (index < 10 || (user && item.id == user.id)) {
            createRow(data);
        }

        if (user && item.id == user.id) {
            foundUser = true;
        }
    }
}

function createRow(data) {
    let tr = $("<tr></tr>");
    if (data.mark) {
        tr = $("<tr class='table-info'></tr>");
    }
    let positionDiv = $("<th scope='row'></th>").text(data.position);
    let usernameDiv = $("<td></td>").text(data.username);
    let scoreDiv = $("<td></td>").text(data.score);
    $(tr).append(positionDiv);
    $(tr).append(usernameDiv);
    $(tr).append(scoreDiv);
    $("#scoreboardTable").append(tr);
}

function extendedRow() {
    let tr = $("<tr></tr>");
    let positionDiv = $("<th scope='row'></th>").text("");
    let usernameDiv = $("<td></td>").text("...");
    let scoreDiv = $("<td></td>").text("");
    $(tr).append(positionDiv);
    $(tr).append(usernameDiv);
    $(tr).append(scoreDiv);
    $("#scoreboardTable").append(tr);
}
