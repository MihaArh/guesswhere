let canvas;
let capture;
let w = 640;
let h = 480;

function setup() {
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

function draw() {
	drawInitialNosePosition(100, 100)
}

function drawInitialNosePosition(x, y) {
	let c = color("magenta");
	fill(c);
	ellipse(x, y, 50, 50);
  }