class Cloud {
    constructor(sketch) {
        this.x = random(windowWidth);
        this.y = random(windowHeight);
        this.size = random(0.8, 3);
        this.opacity = random(63, 255);
        this.sketch = sketch;
    }

    display() {
        this.sketch.fill(255, 255, 255, this.opacity);
        this.sketch.noStroke();
        this.sketch.arc(
            this.x,
            this.y,
            25 * this.size,
            20 * this.size,
            PI + TWO_PI,
            TWO_PI
        );
        this.sketch.arc(
            this.x + 10,
            this.y,
            25 * this.size,
            45 * this.size,
            PI + TWO_PI,
            TWO_PI
        );
        this.sketch.arc(
            this.x + 25,
            this.y,
            25 * this.size,
            35 * this.size,
            PI + TWO_PI,
            TWO_PI
        );
        this.sketch.arc(
            this.x + 40,
            this.y,
            30 * this.size,
            20 * this.size,
            PI + TWO_PI,
            TWO_PI
        );
    }
    move() {
        this.x = this.x += 1;
        this.y = this.y;
    }
}
