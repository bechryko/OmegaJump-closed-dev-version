const FONT = "Arial";

class CanvasDrawer {

    constructor(canvasId) {
        let c = globalThis.document.getElementById(canvasId);
        c.width = globalThis.innerWidth;
        c.height = globalThis.innerHeight;
        this._ctx = c.getContext("2d");
        this._ctx.lineCap = "round";
        this._ctx.textBaseline = "middle";
        this.hide();
    }
    get middlePx() {
        return {x: globalThis.innerWidth / 2, y: globalThis.innerHeight / 2};
    }
    get middle() {
        return {x: 50, y: pxToUnit(this.middlePx.y)};
    }

    show() {
        this._ctx.canvas.style.visibility = "visible";
    }
    hide() {
        this._ctx.canvas.style.visibility = "hidden";
    }

    shape(drawColor, fillColor, shapeFunc, thickness = 0.1, drawFunc = () => this._ctx.stroke(), fillFunc = () => this._ctx.fill()) {
        if(!drawColor && !fillColor) {
            console.warn(`Calling drawing function without color parameters`);
            return;
        }
        shapeFunc();
        if(fillColor) {
            this.fillColor = fillColor;
            fillFunc();
        }
        if(drawColor) {
            this.drawColor = drawColor;
            this.lineWidth = unitToPx(thickness);
            drawFunc();
        }
    }
    rectangle(centerX, centerY, width, height, drawColor, fillColor, thickness) {
        let rect = () => {
            this._ctx.beginPath();
            this._ctx.rect(
                unitToPx(centerX - width / 2), 
                globalThis.innerHeight - unitToPx(centerY + height / 2), 
                unitToPx(width), 
                unitToPx(height)
            );
        };
        this.shape(drawColor, fillColor, rect, thickness);
    }
    circle(centerX, centerY, r, drawColor, fillColor, thickness) {
        let arc = () => {
            this._ctx.beginPath();
            this._ctx.arc(
                unitToPx(centerX), 
                globalThis.innerHeight - unitToPx(centerY), 
                unitToPx(r), 
                0, Math.PI * 2
            );
        };
        this.shape(drawColor, fillColor, arc, thickness);
    }
    text(text, centerX, centerY, size, drawColor, fillColor, textAlign = "center") {
        this.textAlign = textAlign;
        this.shape(
            drawColor, fillColor, 
            () => this.fontSize = unitToPx(size), undefined,
            () => this._ctx.strokeText(text, unitToPx(centerX), globalThis.innerHeight - unitToPx(centerY)),
            () => this._ctx.fillText(text, unitToPx(centerX), globalThis.innerHeight - unitToPx(centerY))
        );
    }
    line(startX, startY, endX, endY, color, thickness = 0) {
        this.drawColor = color;
        this.lineWidth = unitToPx(thickness);
        this._ctx.beginPath();
        this._ctx.moveTo(unitToPx(startX), globalThis.innerHeight - unitToPx(startY));
        this._ctx.lineTo(unitToPx(endX), globalThis.innerHeight - unitToPx(endY));
        this._ctx.stroke();
    }
    image(img, x, y, width, height) {
        //TODO: y koordinata biztosan jo?
        this._ctx.drawImage(img, unitToPx(x - width / 2), globalThis.innerHeight - unitToPx(y + height / 2), unitToPx(width), unitToPx(height));
    }
    imagePart(img, srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH) {
        this._ctx.drawImage(img, srcX, srcY, srcW, srcH, unitToPx(dstX - dstW / 2), globalThis.innerHeight - unitToPx(dstY + dstH / 2), unitToPx(dstW), unitToPx(dstH))
    }
    clear(color) {
        this._ctx.clearRect(0, 0, globalThis.innerWidth, globalThis.innerHeight);
        this.fillColor = color;
        this._ctx.fillRect(0, 0, globalThis.innerWidth, globalThis.innerHeight);
    }

    set fillColor(value) {
        if(this._ctx.fillStyle != value) {
            this._ctx.fillStyle = value;
        }
    }
    get fillColor() {
        return this._ctx.fillStyle;
    }
    set drawColor(value) {
        if(this._ctx.strokeStyle != value) {
            this._ctx.strokeStyle = value;
        }
    }
    get drawColor() {
        return this._ctx.strokeStyle;
    }
    set lineWidth(value) {
        if(this._ctx.lineWidth != value) {
            this._ctx.lineWidth = value;
        }
    }
    get lineWidth() {
        return this._ctx.lineWidth;
    }
    set fontSize(value) {
        value = value + "px " + FONT;
        if(this._ctx.font != value) {
            this._ctx.font = value;
        }
    }
    get fontSize() {
        let i;
        for(i = 0; i < this._ctx.font.length; i++) {
            if(this._ctx.font[i] == "p") {
                break;
            }
        }
        return +this._ctx.font.substring(0, i);
    }
    set textAlign(value) {
        if(this._ctx.textAlign != value) {
            this._ctx.textAlign = value;
        }
    }
    get textAlign() {
        return this._ctx.textAlign;
    }
    set globalAlpha(value) {
        if(this._ctx.globalAlpha != value) {
            this._ctx.globalAlpha = value;
        }
    }
    get globalAlpha() {
        return this._ctx.globalAlpha;
    }
}

const menuCanvas = new (
    class MenuDrawer extends CanvasDrawer {
        constructor(id) {
            super(id);
        }

        drawStars(stars, outerRange, innerRangeRatio) {
            for(const star of stars) {
                if(star.distance > outerRange) {
                    this.globalAlpha = 1;
                } else if(star.distance < outerRange * innerRangeRatio) {
                    this.globalAlpha = 0;
                } else {
                    this.globalAlpha = (star.distance / outerRange - innerRangeRatio) / (1 - innerRangeRatio);
                }
                this.circle(star.x, pxToUnit(globalThis.innerHeight) - star.y, star.size, "yellow", "yellow");
            }
            this.globalAlpha = 1;
        }
    }
)("menu");

const gameCanvas = new (
    class GameDrawer extends CanvasDrawer {
        constructor(id) {
            super(id);
        }

        drawPlayer(player, screen) {
            this.circle(player.pos.x, player.pos.y - screen, player.size, null, player.color);
            if(player.duel?.health == 1) {
                let crossThickness = 0.1;
                this.line(player.pos.x - player.size, player.pos.y - player.size - screen, player.pos.x + player.size, player.pos.y + player.size - screen, "red", crossThickness);
                this.line(player.pos.x + player.size, player.pos.y - player.size - screen, player.pos.x - player.size, player.pos.y + player.size - screen, "red", crossThickness);
            }
        }
        drawPlatform(platform, screen) {
            const INVISIBLE_ALPHA = 0.3;
            let w = platform.width, h = platform.height;
            if(platform.specialTexture) {
                w *= platform.specialTexture.x;
                h *= platform.specialTexture.y;
            }
            if(!platform.attributes.invisible) {
                if(platform.img) {
                    this.image(platform.img, platform.pos.x, platform.pos.y - screen, w, h);
                } else {
                    this.line(
                        platform.pos.x - platform.width / 2 + platform.height / 2, platform.pos.y - screen,
                        platform.pos.x + platform.width / 2 - platform.height / 2, platform.pos.y - screen,
                        platform.color, platform.height
                    );
                }
            }
            if(Game.object.dev.attributeInspector) {
                let attr = 0;
                for(const attribute in platform.attributes) {
                    if(platform.attributes[attribute]) {
                        this.text(attribute, platform.pos.x, platform.pos.y + ++attr * platform.height * 2 - screen, platform.height * 1.75, "white");
                    }
                    if(attribute == "projection") {
                        let x = platform.pos.x - platform.attributes.projection.x;
                        let y = platform.pos.y - platform.attributes.projection.y - screen;
                        this.globalAlpha = INVISIBLE_ALPHA;
                        if(platform.img) {
                            this.image(platform.img, x, y, w, h);
                        } else {
                            this.line(
                                x - platform.width / 2 + platform.height / 2, y,
                                x + platform.width / 2 - platform.height / 2, y,
                                platform.color, platform.height
                            );
                        }
                        this.globalAlpha = 1;
                    } else if(attribute == "invisible") {
                        this.globalAlpha = INVISIBLE_ALPHA;
                        if(platform.img) {
                            this.image(platform.img, platform.pos.x, platform.pos.y - screen, w, h);
                        } else {
                            this.line(
                                platform.pos.x - platform.width / 2 + platform.height / 2, platform.pos.y - screen,
                                platform.pos.x + platform.width / 2 - platform.height / 2, platform.pos.y - screen,
                                platform.color, platform.height
                            );
                        }
                        this.globalAlpha = 1;
                    }
                }
            }
        }
        drawObjects(gameObjects, screen) {
            for(const object of gameObjects) {
                object.draw(screen);
            }
        }
        drawUI(gametype, screen, fps, moveFpsMultiplier, dev, bonus) {
            //Main score
            this.text(`${gametype}: ${screen}`, this.middle.x, pxToUnit(globalThis.innerHeight) - 2.5, pxToUnit(globalThis.innerHeight / 20), "white", "white");
            //FPS
            if(fps) {
                this.text(`${fps} fps`, 0, pxToUnit(globalThis.innerHeight) - 1, 1, "white", "white", "left");
                let moveFps = fps * moveFpsMultiplier;
                let amount = moveFps > 2_000_000 ? 0 : (moveFps > 2000 ? 1 : 2)
                this.text(`${moveFps / [1_000_000, 1_000, 1][amount] + ["m", "k", ""][amount]} movement fps`, 0, pxToUnit(globalThis.innerHeight) - 1.5, 0.5, undefined, "white", "left");
            }
            //development tools
            if(dev.paused) {
                this.globalAlpha = 0.6;
                this.rectangle(46, this.middle.y, 4, 12, "white", "white");
                this.rectangle(54, this.middle.y, 4, 12, "white", "white");
                this.globalAlpha = 1;
            }
            //God or duel scpre
            if(bonus instanceof God) {
                const god = bonus;
                const percentHealth = god.health / god.maxHealth;
                this.rectangle(gameCanvas.middle.x, 3, 40.4, 3.4, "black", "black");
                this.rectangle(gameCanvas.middle.x - (40 * (1 - percentHealth)) / 2, 3, 40 * percentHealth, 3, "red", "red");
                this.text(`${Math.round(god.health)} / ${Math.round(god.maxHealth)}`, gameCanvas.middle.x, 3, 2.5, "white", "white");
            } else if(bonus){
                const players = bonus;
                for(let i = 0; i < players.length; i++) {
                    if(!players[i].alive) {
                        continue;
                    }
                    const middleX = (i + 1) / (players.length + 1) * 100;
                    const duel = players[i].duel;
                    if(duel.level < 3) {
                        this.rectangle(middleX + 2, 3, 10.4, 3.4, "black", "black");
                        this.rectangle(middleX + 2, 3, 10, 3, "darkgrey", "darkgrey");
                        this.rectangle(middleX + 2 - 10 * (100 - duel.exp) / 100 / 2, 3, 10 * duel.exp / 100, 3, players[i].color, players[i].color);
                        this.rectangle(middleX - 5, 3, 4, 4, "black", "black");
                        this.text(duel.level, middleX - 5, 3, 3, players[i].color, players[i].color);
                    } else {
                        this.rectangle(middleX, 3, 4, 4, "black", "black");
                        this.text(duel.level, middleX, 3, 3, players[i].color, players[i].color);
                    }
                }
            }
        }

        highlightElement({pos}, color = "red") {
            this.circle(pos.x, pos.y - Game.object.screen, 3, color, undefined, 0.4);
        }
    }
)("game");
