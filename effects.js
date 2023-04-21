class Effect {
    static pool;

    createEffect(pos, time) {
        this.pos = pos;
        this.totalTime = this.timeLeft = time;

        this.disabled = false;
    }
    tick(deltaTime) {
        this.timeLeft -= deltaTime;
        if(this.timeLeft < 0) {
            this.disabled = true;
        }
    }
    draw(screen) {}
    static startEffect(cl, pos, time) {
        let finalEffect;
        for(const effect of cl.pool) {
            if(effect.disabled) {
                effect.createEffect(pos, time);
                finalEffect = effect;
                break;
            }
        }
        if(!finalEffect) {
            finalEffect = new cl();
            finalEffect.createEffect(pos, time);
            cl.pool.push(finalEffect);
        }
        if(!Effect.pool.includes(finalEffect)) {
            Effect.pool.push(finalEffect);
        }
        return finalEffect;
    }
}
class ChangingEffect extends Effect {
    static startEffect(cl, pos, endPos, time, size, endSize) {
        let effect = Effect.startEffect(cl, pos, time);
        effect.size = effect.startSize = size;
        effect.endSize = endSize;
        effect.startPos = {x: pos.x, y: pos.y};
        effect.endPos = endPos;
        return effect;
    }
    tick(deltaTime) {
        super.tick(deltaTime);
        if(this.endSize !== undefined) {
            this.size = (1 - this.timeLeft / this.totalTime) * (this.endSize - this.startSize) + this.startSize;
        }
        if(this.endPos?.x !== undefined) {
            this.pos.x = (1 - this.timeLeft / this.totalTime) * (this.endPos.x - this.startPos.x) + this.startPos.x;
        }
        if(this.endPos?.y !== undefined) {
            this.pos.y = (1 - this.timeLeft / this.totalTime) * (this.endPos.y - this.startPos.y) + this.startPos.y;
        }
    }
}

class TextEffect extends ChangingEffect {
    static pool = [];

    static startEffect(text, pos, time, size, drawColor, fillColor, endSize, textAlign, fixed = false) {
        let effect = ChangingEffect.startEffect(TextEffect, pos, undefined, time, size, endSize);
        effect.text = text;
        effect.drawColor = drawColor;
        effect.fillColor = fillColor;
        effect.textAlign = textAlign;
        effect.fixed = fixed;
        return effect;
    }
    tick(deltaTime) {
        super.tick(deltaTime);
    }
    draw(screen) {
        gameCanvas.text(this.text, this.pos.x, this.pos.y - (this.fixed ? 0 : screen), this.size, this.drawColor, this.fillColor, this.textAlign);
    }
}

class TeleportLine extends Effect {
    static pool = [];

    static MIN_WIDTH = 0.05;
    static MAX_WIDTH = 0.3;
    static TIME = 0.75;

    static startEffect(startX, endX, startY, endY, color) {
        let effect = Effect.startEffect(TeleportLine, {x: startX, y: startY}, TeleportLine.TIME);
        effect.endPos = {x: endX, y: endY};
        effect.color = color;
        effect.currentWidth = TeleportLine.WIDTH;
        return effect;
    }
    draw(screen) {
        gameCanvas.line(this.pos.x, this.pos.y - screen, this.endPos.x, this.endPos.y - screen, this.color, 
            this.timeLeft / this.totalTime * TeleportLine.MAX_WIDTH + TeleportLine.MIN_WIDTH);
    }
}

class ProjectileEffect extends ChangingEffect {
    static pool = [];

    static startEffect(cl, startPos, endPos, time, size, color, shape, endSize, thickness) {
        let effect = ChangingEffect.startEffect(cl, startPos, endPos, time, size, endSize);
        effect.color = color;
        shape = shape.toLowerCase();
        effect.fillColor = shape.startsWith("empty") ? undefined : color;
        effect.shape = shape;
        effect.thickness = thickness;
        return effect;
    }
    draw(screen) {
        if(this.shape.endsWith("circle")) {
            gameCanvas.circle(this.pos.x, this.pos.y - screen, this.size, this.color, this.fillColor, this.thickness);
        }
    }
}

class Projectile extends ProjectileEffect {
    static pool = [];

    static startEffect(startPos, endPos, time, size, color, shape, playerTouch, platformTouch) {
        let effect = ProjectileEffect.startEffect(Projectile, startPos, endPos, time, size, color, shape);
        effect.playerTouch = playerTouch;
        effect.platformTouch = platformTouch;
        return effect;
    }
}


class AnimationEffect {
    constructor(name, time, frames, frameWidth, frameHeight) {
        this.name = name;
        this.img = new Image();
        this.img.src = `img//animations//${this.name}.png`;
        this.time = time;
        this.frames = frames;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.timeLeft = this.time / this.frames;
        this.currentFrame = 0;
    }

    update(deltaTime) {
        this.timeLeft -= deltaTime;
        if(this.timeLeft <= 0) {
            this.timeLeft += this.time / this.frames;
            this.currentFrame = (this.currentFrame + 1) % this.frames;
        }
    }
    draw(pos, width, height, screen) {
        gameCanvas.imagePart(this.img, 0, this.currentFrame * this.frameHeight, this.frameWidth, this.frameHeight, pos.x, pos.y - screen, width, height);
    }
}