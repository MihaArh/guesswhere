class Fog {
    constructor(sketch) {
        this.x1 = 0;
        this.y1 = random(windowHeight);
        this.x2 = windowWidth;
        this.y2 = random(windowHeight);
        this.sketch = sketch;
        this.angle = random(TWO_PI);
        this.color = color(random(20, 50), random(20, 25));
        this.speed = this.y1 >= (windowHeight / 2) ? random(0.5, 1.5) : random(-0.5, -1.5);
    }

    paint() {
        this.sketch.fill(this.color);
        this.sketch.noStroke();
        this.sketch.rect(this.x1, this.y1, this.x2, this.y2);
    }

    update() {
        this.y1 += this.speed;
        this.y2 += this.speed;
        // this.angle += random(-0.15, 0.15);
    }
}

// function Fog() {
// 	this.x = random(width);
// 	this.y = random(height);
// 	this.angle = random(TWO_PI);

//   this.clr = color(random(255), random(255), random(255), 5);

// 	this.paint = function() {

// 		var px = this.x;
// 		var py = this.y;
// 		var r = 50;
// 		var u = random(0.425, 1);

// 		fill(this.clr);
// 		noStroke();
// 		beginShape();
// 		for (var a = 0; a < TWO_PI; a += PI / 180) {
// 			vertex(px, py);
// 			px = this.x + r * cos(this.angle + a) * u;
// 			py = this.y + r * sin(this.angle + a) * u;
// 			r += sin(a * random(0.25, 2));
// 		}
// 		endShape();

// 	};

// 	// Increment angle variable by PI/2 when x or y hits boundaries
// 	this.change = function() {
// 		if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
// 			this.angle += HALF_PI;
// 		}
// 	};

// 	this.update = function() {

// 		this.x += 2 * cos(this.angle);
// 		this.y += 2 * sin(this.angle);
// 		this.angle += random(-0.15, 0.15);
// 	};

// }
