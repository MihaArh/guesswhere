class Snow {
    constructor(sketch) {
      this.x = random(windowWidth);
      this.y = random(windowHeight);
      this.size = random(3, 5);
      this.speed = random(0, 5);
      this.sketch = sketch;
  
    }
  
    display() {
      this.sketch.noStroke();
      this.sketch.fill(239, 245, 255, 200);
      this.sketch.ellipse(this.x + 100 * sin(this.speed), this.y + 100 * cos(this.speed), this.size);
    }
  
    descend() {
      this.y = this.y + this.speed;
      this.x = this.x + random(-2, 2);
    }
  
    update() {
      this.y = this.y + this.speed;
      this.speed = this.speed + 0.01;
    }
  }