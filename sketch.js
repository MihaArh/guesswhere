let canvas;
let capture;
let w = 640;
let h = 480;
let chroma;
let seriously;

function setup() {
  initCamera();
  initSeriously();
}

function draw() {
	chromaKey();
}

function initCamera(){
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