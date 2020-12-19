class Sun {
    constructor(sketch) {
        this.x = windowWidth * 0.1;
        this.y = windowHeight * 0.1;
        this.sketch = sketch;
        this.RDS = random(280, 650);
    }

    shine() {
        this.sketch.noStroke();
        this.sketch.fill(200, 130, 10, 20);
        this.sketch.ellipse(0, 0, (frameCount % 500) * 2, (frameCount % 500) * 2);
        this.sketch.ellipse(0, 0, (frameCount % 500) * 4, (frameCount % 500) * 4);
        this.sketch.ellipse(0, 0, (frameCount % 500) * 8, (frameCount % 500) * 8);
        this.sketch.ellipse(0, 0, (frameCount % 500) * 16, (frameCount % 500) * 16);
        this.sketch.ellipse(0, 0, (frameCount % 500) * 24, (frameCount % 500) * 24);
        this.sketch.fill(200, 130, 10);
        this.sketch.ellipse(0, 0, this.RDS, this.RDS);
        this.sketch.fill(250, 200, 0);
        this.sketch.ellipse(5, -11, this.RDS - 20, this.RDS - 30);
    }
}
