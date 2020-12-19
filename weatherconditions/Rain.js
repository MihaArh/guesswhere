class Rain {
    constructor(sketch) {
        this.x = random(windowWidth);
        this.y = random(windowHeight);
        this.sketch = sketch;
        this.length = 15;
        this.r = 0;
        this.opacity = 200;
    }

    dropRain() {
        this.sketch.noStroke();
        this.sketch.fill(255);
        this.sketch.ellipse(this.x, this.y, 3, this.length);
        this.y = this.y + 6;
        if (this.y > windowHeight - windowHeight * 0.25) {
            this.length = this.length - 5;
        }
        if (this.length < 0) {
            this.length = 0;
        }
    }

    splash() {
        this.sketch.strokeWeight(2);
        this.sketch.stroke(245, this.opacity);
        this.sketch.noFill();
        if (this.y > windowHeight - windowHeight * 0.25) {
            this.sketch.ellipse(
                this.x,
                windowHeight - windowHeight * 0.25,
                this.r * 2,
                this.r / 2
            );
            this.r++;
            this.opacity = this.opacity - 10;
        }
    }
}
