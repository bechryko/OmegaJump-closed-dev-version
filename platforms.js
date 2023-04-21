class Platform {
    static pool;
    static highest;
    static nextSpaceBetween;

    static SPACE_BETWEEN = [2, 3.5];
    static DOUBLE_CHANCE = 0.05;
    static WIDTH = 3.5;
    static GENERAL_JUMP_HEIGHT = 13;
    static PLATFORM_G = 30;

    static MOVE_SPEED = [5, 15];
    static DODGE_SPEED = 14;
    static TROLL_DETECTION_RANGE = 4;
    static BOOSTER_BOOST = 1.25;

    static GENERAL_PROJECTION_CHANCE = 0.03;
    static BLINKFECTION_BLINKS = [3, 5, 7];
    static SPREAD_TIME = 4;
    static SPREAD_RANGE = 20;

    static SIMPLE_TEXTURE_PLATFORMS = new Set(["God Slayer", "Resurrection"]);

    disabled = true;

    createPlatform(name, color, jumpHeight, pos, attributes, specialTexture = false) {
        this.name = name;
        this.color = color;
        this.jumpHeight = jumpHeight;
        this.width = Platform.WIDTH;
        this.pos = pos;
        this.attributes = {
            activator: false, //TODO: visual
            blinkfected: false, //TODO: visual
            booster: false,
            invisible: false,
            moving: false,
            projection: false,
            spreading: false, //TODO
            troll: false,
        };
        this.velocity = {
            x: 0,
            y: 0
        };
        this.specialTexture = specialTexture;
        this.animations = [];

        attributes.projection ??= Platform.GENERAL_PROJECTION_CHANCE;
        for(const attr in attributes) {
            if(random() < attributes[attr]) {
                this.setAttribute(attr);
            }
        }
        
        this.disabled = false;
    }
    setAttribute(attrName, value) {
        this.attributes[attrName] = value ?? true;
        if(value === false) {
            return;
        }
        switch(attrName) {
            case "moving":
                value ?? (this.attributes.moving = random(Platform.MOVE_SPEED[0], Platform.MOVE_SPEED[1]) * (random() < .5 ? 1 : -1));
                break;
            case "booster":
                this.animations.push(new AnimationEffect("booster", 1, 16, 600, 150));
                break;
            case "projection":
                value ?? (this.attributes.projection = {x: random(-this.width, this.width), y: this.width * random(1, 1.5)});
                this.pos.x += this.attributes.projection.x;
                this.pos.y += this.attributes.projection.y;
                break;
            case "spreading":
                value ?? (this.attributes.spreading = {target: null, time: Platform.SPREAD_TIME});
                break;
        }
    }
    doTouch(player) {
        if(player.velocity?.y > 0) {
            return false;
        }
        let leftPointX = this.pos.x - this.width / 2 + this.height / 2;
        let rightPointX = this.pos.x + this.width / 2 - this.height / 2;
        let directTouch = 
            player.pos.x >= leftPointX
            && player.pos.x <= rightPointX
            && player.pos.y <= this.pos.y + player.size + this.height / 2
            && player.pos.y >= this.pos.y - player.size - this.height / 2;
        let leftCornerTouch = 
            player.pos.x <= leftPointX
            && (player.pos.x - leftPointX) ** 2 + (player.pos.y - this.pos.y) ** 2 <= player.size ** 2;
        let rightCornerTouch = 
            player.pos.x >= rightPointX
            && (player.pos.x - rightPointX) ** 2 + (player.pos.y - this.pos.y) ** 2 <= player.size ** 2;
        return directTouch || leftCornerTouch || rightCornerTouch;
    }
    move(deltaTime) {
        this.pos.x += (this.velocity.x -= Math.sign(this.velocity.x) * Platform.PLATFORM_G * deltaTime) * deltaTime;
        this.pos.y += (this.velocity.y -= Math.sign(this.velocity.y) * Platform.PLATFORM_G * deltaTime) * deltaTime;
        if(this.attributes.moving) {
            this.pos.x += this.attributes.moving * deltaTime;
            if(this.pos.x + this.width < 0) {
                this.pos.x = 100 + this.width;
            } else if(this.pos.x > 100 + this.width) {
                this.pos.x = -this.width;
            }
        }
        if(this.attributes.troll) {
            let target = findClosestPlayer(this.pos, 0);
            if(Math.abs(this.pos.x - target.pos.x) < Platform.TROLL_DETECTION_RANGE && target.velocity.y < 0 && target.pos.y > this.pos.y) {
                this.pos.x += Platform.DODGE_SPEED * (target.movement.right - target.movement.left) * deltaTime * (target.effects.confusion ? -1 : 1);
                if(this.pos.x + this.width < 0) {
                    this.pos.x = 100 + this.width;
                } else if(this.pos.x > 100 + this.width) {
                    this.pos.x = -this.width;
                }
            }
        }
        return this;
    }
    spread(deltaTime) {
        let checkTarget = t => t !== null && t.constructor != this.constructor && !t.disabled;
        const spreading = this.attributes.spreading;
        if(spreading.time <= 0 && spreading.target !== null) {
            spreading.target.setAttribute("spreading");
            spreading.target.transform({platformList: [new PlatformEntry(this.constructor, 1)]});
            spreading.target = null;
        }
        if(!checkTarget(spreading.target)) {
            const closest = findNClosest(this.pos, 1, Platform.pool.filter(p => checkTarget(p)))[0];
            if(distanceSq(closest.pos, this.pos) <= Platform.SPREAD_RANGE ** 2) {
                spreading.target = closest;
                spreading.time = Platform.SPREAD_TIME;
            }
        }
        if(checkTarget(spreading.target)) {
            if(distanceSq(spreading.target.pos, this.pos) <= Platform.SPREAD_RANGE ** 2) {
                spreading.time -= deltaTime;
            } else {
                spreading.target = null;
            }
        }
        return this;
    }
    touchAction(player) {
        let jumpHeight = this.jumpHeight * (this.attributes.booster ? Platform.BOOSTER_BOOST : 1);
        player.jump(jumpHeight);
        if(this.attributes.blinkfected) {
            const blinks = player.effects.blinking ? player.effects.blinking + 1 : random(Platform.BLINKFECTION_BLINKS);
            player.addEffect("blinking", blinks);
        }
        if(this.attributes.activator) {
            const chosen = random(Platform.pool.filter(p => !p.disabled && !(p instanceof BasicPlatform)));
            chosen.touchAction(player);
            TeleportLine.startEffect(this.pos.x, chosen.pos.x, this.pos.y, chosen.pos.y, "#ffe186");
        }
        if(Game.object.god) {
            Game.object.god.passiveAttack(player, this);
        }
    }
    draw(screen) {
        gameCanvas.drawPlatform(this, screen);
        if(!this.attributes.invisible) {
            if(this.animations.length) {
                for(const animation of this.animations) {
                    animation.draw(this.pos, this.width * 1.2, this.height * 1.5, screen);
                }
            }
            if(this.attributes.spreading) {
                const spreading = this.attributes.spreading;
                if(spreading.target !== null) {
                    gameCanvas.line(this.pos.x, this.pos.y - Game.object.screen, spreading.target.pos.x, spreading.target.pos.y - Game.object.screen, this.color, 0.25);
                }
                if(!this.attributes.invisible && Game.object.dev.rangeIndicator) {
                    gameCanvas.circle(this.pos.x, this.pos.y - Game.object.screen, Platform.SPREAD_RANGE, spreading.target === null ? "red" : "green", null, 0.05);
                }
            }
        }
    }
    makeCopy(posModifier = {x: 0, y: 0}, multiplier = 1) {
        return {
            pos: {
                x: this.pos.x + posModifier.x * multiplier,
                y: this.pos.y + posModifier.y * multiplier
            },
            width: this.width,
            height: this.height,
            color: this.color,
            isCopy: true
        };
    }
    transform(entries) {
        let platformType = GameType.prototype.choosePlatform.bind(entries)();
        let newPlatform = platformType.newPlatform({x: this.pos.x, y: this.pos.y}, {});
        for(const attr in this.attributes) {
            newPlatform.setAttribute(attr, this.attributes[attr]);
        }
        this.disabled = true;
        if(!Platform.pool.includes(newPlatform)) {
            Platform.pool.push(newPlatform);
        }
    }
    get height() {
        return this.width / 5;
    }
    static newPlatform(cl, name, color, jumpHeight, pos, attributes, specialTexture) {
        for(const platform of cl.pool) {
            if(platform.disabled) {
                platform.createPlatform(name, color, jumpHeight, pos, attributes, specialTexture);
                return platform;
            }
        }
        let platform = new cl();
        platform.createPlatform(name, color, jumpHeight, pos, attributes, specialTexture);
        if(!Platform.SIMPLE_TEXTURE_PLATFORMS.has(platform.name)) {
            platform.img = new Image();
            platform.img.src = `img//platforms//${platform.name.replaceAll(" ", "_")}.png`;
        }
        cl.pool.push(platform);
        return platform;
    }
}

class BasicPlatform extends Platform {
    static pool = [];

    static MOVING_CHANCE = 0.075;
    static TROLL_CHANCE = 0.02;
    static BOOSTER_CHANCE = 0.05;
    static ACTIVATOR_CHANCE_IN_CHAOS = 0.05;

    static newPlatform(pos, attributes = {
        moving: BasicPlatform.MOVING_CHANCE, troll: BasicPlatform.TROLL_CHANCE, booster: BasicPlatform.BOOSTER_CHANCE,
        activator: Game.object.gameType.name == "Chaos" ? BasicPlatform.ACTIVATOR_CHANCE_IN_CHAOS : undefined
    }) {
        return Platform.newPlatform(BasicPlatform, "Basic", "forestgreen", Platform.GENERAL_JUMP_HEIGHT, pos, attributes);
    }
}

class BlinkerPlatform extends Platform {
    static pool = [];

    static JUMP_HEIGHT = 20;
    static DY_RANGE = [-5, 15];

    static newPlatform(pos, attributes = {}) {
        return Platform.newPlatform(BlinkerPlatform, "Blinker", "#2B2D6F", BlinkerPlatform.JUMP_HEIGHT, pos, attributes);
    }
    touchAction(player) {
        super.touchAction(player);
        player.teleport(random(pxToUnit(globalThis.innerWidth)), player.pos.y + random(BlinkerPlatform.DY_RANGE[0], BlinkerPlatform.DY_RANGE[1]));
    }
}

class CloakerPlatform extends Platform {
    static pool = [];

    static CLOAK_R = 20;

    static newPlatform(pos, attributes = {}) {
        return Platform.newPlatform(CloakerPlatform, "Cloaker", "gold", Platform.GENERAL_JUMP_HEIGHT, pos, attributes);
    }
    touchAction(player) {
        super.touchAction(player);
        for(const platform of Platform.pool) {
            if(this == platform) {
                continue;
            }
            if(distanceSq(this.pos, platform.pos) < CloakerPlatform.CLOAK_R ** 2) {
                platform.setAttribute("invisible");
            }
        }
    }
    draw(screen) {
        super.draw(screen);
        if(!this.attributes.invisible && Game.object.dev.rangeIndicator) {
            gameCanvas.circle(this.pos.x, this.pos.y - Game.object.screen, CloakerPlatform.CLOAK_R, this.color, null, 0.05);
        }
    }
}

class ConfusePlatform extends Platform {
    static pool = [];

    static CONFUSION_TIME = 3;

    static BOOSTER_CHANCE = 0.075;

    static newPlatform(pos, attributes = {
        booster: ConfusePlatform.BOOSTER_CHANCE
    }) {
        return Platform.newPlatform(ConfusePlatform, "Confuse", "magenta", Platform.GENERAL_JUMP_HEIGHT, pos, attributes);
    }
    touchAction(player) {
        super.touchAction(player);
        player.addEffect("confusion", ConfusePlatform.CONFUSION_TIME);
    }
}

class EnergyPlatform extends Platform {
    static pool = [];

    static CHARGED_COLOR = "cyan";
    static DAMAGE_COLOR = "#539f31";
    static UNCHARGED_COLOR = "grey";

    static GREEN_ENERGY_MAX_CHANCE = 0.5;
    static GREEN_ENERGY_SPAWN_CONDITION = 25;

    static newPlatform(pos, attributes = {projection: 0}) {
        let platform = Platform.newPlatform(EnergyPlatform, "Energy", EnergyPlatform.CHARGED_COLOR, Platform.GENERAL_JUMP_HEIGHT, pos, attributes);
        let alivePlayers = Player.list.filter(p => p.alive);
        platform.charge(Game.object.coop && random() < alivePlayers.filter(p => p.energy > EnergyPlatform.GREEN_ENERGY_SPAWN_CONDITION).length / alivePlayers.length * EnergyPlatform.GREEN_ENERGY_MAX_CHANCE);
        return platform;
    }
    touchAction(player) {
        if(this.charged == 1) {
            player.addEnergy(1);
            this.uncharge();
        } else if(this.charged == 2) {
            player.energy--;
            player.addDamage(Player.ENERGY_DAMAGE_BOOST);
            this.uncharge();
        }
        super.touchAction(player);
    }
    charge(isGreen = false) {
        this.charged = 1 + isGreen;
        if(isGreen) {
            this.img.src = "img//platforms//Energy_Green.png";
            this.color = EnergyPlatform.DAMAGE_COLOR;
        } else {
            this.img.src = "img//platforms//Energy.png";
            this.color = EnergyPlatform.CHARGED_COLOR;
        }
    }
    uncharge() {
        this.charged = false;
        this.img.src = "img//platforms//Energy_Empty.png";
        this.color = EnergyPlatform.UNCHARGED_COLOR;
    }
}

class EnhancerPlatform extends Platform {
    static pool = [];

    static ENHANCE_AMOUNT = 5;
    static PROJECTILE_TIME = 0.5;
    static PROJECTILE_R = 0.5;

    static newPlatform(pos, attributes = {}) {
        return Platform.newPlatform(EnhancerPlatform, "Enhancer", "#82E076", Platform.GENERAL_JUMP_HEIGHT, pos, attributes);
    }
    touchAction(player) {
        super.touchAction(player);
        let toEnhance = [];
        for(let i = 0; i < EnhancerPlatform.ENHANCE_AMOUNT;) {
            let platform = random(Platform.pool.filter(p => !p.disabled && p != this));
            if(!toEnhance.includes(platform)) {
                toEnhance.push(platform);
                i++;
            }
        }
        let shoot = platform => {
            ProjectileEffect.startEffect(ProjectileEffect, this.makeCopy().pos, platform.pos,
                EnhancerPlatform.PROJECTILE_TIME, EnhancerPlatform.PROJECTILE_R, this.color + "80", "circle");
        };
        const excludedAttributes = ["invisible", "spreading"];
        if(Game.object.gameType.name != "Blink") {
            excludedAttributes.push("blinkfected");
        } 
        if(Game.object.gameType.name != "Chaos") {
            excludedAttributes.push("activator");
        }
        nextPlatform:
        for(const platform of toEnhance) {
            shoot(platform);
            for (const attr in this.attributes) {
                if(this.attributes[attr]) {
                    platform.setAttribute(attr, this.attributes[attr]);
                }
            }
            let attributes = 0;
            for(const attribute in platform.attributes) {
                if(excludedAttributes.includes(attribute)) {
                    continue;
                }
                attributes++;
            }
            if(platform instanceof EnergyPlatform) {
                attributes++;
            }
            attributes = Math.floor(random(attributes));
            for(const attribute in platform.attributes) {
                if(excludedAttributes.includes(attribute)) {
                    continue;
                }
                if(!attributes) {
                    platform.setAttribute(attribute);
                    continue nextPlatform;
                }
                attributes--;
            }
            platform.charge();
        }
    }
}

class GodSlayerPlatform extends Platform {
    static pool = [];

    static JUMP_HEIGHT = 16;

    static newPlatform(pos, attributes = {}) {
        return Platform.newPlatform(GodSlayerPlatform, "God Slayer", "#16385B", GodSlayerPlatform.JUMP_HEIGHT, pos, attributes);
    }
    touchAction(player) {
        super.touchAction(player);
        Game.object.god.damage(player.damage * random(0.9, 1.1));
        this.disabled = true;
    }
}

class PullerPlatform extends Platform {
    static pool = [];

    static PULL_RATIO = 0.15;
    static MOVING_PULL_RATIO = 0.4;

    static MOVING_CHANCE = 0.66;

    static newPlatform(pos, attributes = {
        moving: PullerPlatform.MOVING_CHANCE
    }) {
        return Platform.newPlatform(PullerPlatform, "Puller", "#0019b2", Platform.GENERAL_JUMP_HEIGHT, pos, attributes);
    }
    touchAction(player) {
        super.touchAction(player);
        if(!this.attributes.moving) {
            for(const platform of Platform.pool) {
                if(platform.disabled) {
                    continue;
                }
                platform.pos.x += (this.pos.x - platform.pos.x) * PullerPlatform.PULL_RATIO;
                platform.pos.y += (this.pos.y - platform.pos.y) * PullerPlatform.PULL_RATIO;
            }
        } else {
            for(const platform of Platform.pool) {
                if(platform.disabled || (platform.pos.x >= this.pos.x && this.attributes.moving > 0) || (platform.pos.x < this.pos.x && this.attributes.moving < 0)) {
                    continue;
                }
                platform.pos.x += (this.pos.x - platform.pos.x) * PullerPlatform.MOVING_PULL_RATIO;
            }
        }
    }
    draw(screen) {
        super.draw(screen);
        if(!this.attributes.invisible && Game.object.dev.rangeIndicator && this.attributes.moving) {
            gameCanvas.line(this.pos.x, 0, this.pos.x, pxToUnit(globalThis.innerHeight), this.color, 0.05);
        }
    }
}

class ResurrectionPlatform extends Platform {
    static pool = [];

    static SPAWN_CHANCE = 0.01;
    static JUMP_HEIGHT = 20.5;

    static newPlatform(pos, attributes = {projection: 0}) {
        return Platform.newPlatform(ResurrectionPlatform, "Resurrection", "#cfcfcf", ResurrectionPlatform.JUMP_HEIGHT, pos, attributes);
    }
    touchAction(player) {
        if(Game.object.graveyard.length) {
            const resurrected = Game.object.graveyard.splice(0, 1)[0];
            resurrected.alive = true;
            resurrected.pos.x = this.pos.x;
            resurrected.pos.y = this.pos.y + this.height / 2 + resurrected.size;
            resurrected.jump(this.jumpHeight);
            player.brothers.enhanceConnection(resurrected, Player.BROTHER_RESURRECT_ENHANCE);
        }
        super.touchAction(player);
        this.disabled = true;
    }
    draw(screen) {
        super.draw(screen);
        if(!this.attributes.invisible && Game.object.graveyard[0]) {
            gameCanvas.globalAlpha = 0.5;
            gameCanvas.drawPlayer({
                pos: { x: this.pos.x, y: this.pos.y + this.width * 1.5 },
                size: Player.SIZE * 0.75,
                color: Game.object.graveyard[0].color
            }, screen);
            gameCanvas.globalAlpha = 1;
        }
    }
}

class TeleportingPlatform extends Platform {
    static pool = [];

    static JUMP_HEIGHT = 10;
    static TELEPORT_DISTANCE = 5;

    static MOVING_CHANCE = 0.1;
    static TROLL_CHANCE = 0.075;
    static BOOSTER_CHANCE = 0.1;

    static newPlatform(pos, attributes = {
        moving: TeleportingPlatform.MOVING_CHANCE, troll: TeleportingPlatform.TROLL_CHANCE, booster: TeleportingPlatform.BOOSTER_CHANCE
    }) {
        return Platform.newPlatform(TeleportingPlatform, "Teleporting", "#ca003a", TeleportingPlatform.JUMP_HEIGHT, pos, attributes);
    }
    touchAction(player) {
        super.touchAction(player);
        let direction = random(0, Math.PI * 2);
        this.pos.x += TeleportingPlatform.TELEPORT_DISTANCE * Math.sin(direction);
        this.pos.y += TeleportingPlatform.TELEPORT_DISTANCE * Math.cos(direction);
    }
}

class TransformerPlatform extends Platform {
    static pool = [];

    static BOOSTER_CHANCE = 0.05;

    static newPlatform(pos, attributes = {
        booster: TransformerPlatform.BOOSTER_CHANCE
    }) {
        return Platform.newPlatform(TransformerPlatform, "Transformer", "white", Platform.GENERAL_JUMP_HEIGHT, pos, attributes);
    }
    touchAction(player) {
        super.touchAction(player);
        for(const platform of Platform.pool) {
            if(platform.disabled) {
                continue;
            }
            platform.transform(transformEntries);
        }
    }
}

class TrickOrTreatPlatform extends Platform {
    static pool = [];

    static TRANSFORM_CHANCE = 0.1;

    static CROW_NUMBER = [10, 15];
    static CROW_HEIGHT_R = [-15, 50];
    static CROW_FLIGHT_TIME = 3;
    static CROW_STRENGTH = 70;
    static HIDE_TIME = [3, 6];

    static newPlatform(pos, attributes = {projection: 0}) {
        return Platform.newPlatform(TrickOrTreatPlatform, "Trick or Treat", "orangeRed", Platform.GENERAL_JUMP_HEIGHT, pos, attributes, {x: 1.2, y: 1.5});
    }
    touchAction(player) {
        super.touchAction(player);
        this.disabled = true;
        let text = random() < .5 ? "Tricked!" : "Treated!";
        if(text == "Treated!") {
            player.addEnergy(5, false);
            Game.object.addScore(50);
        } else {
            let trick = Math.floor(random(3));
            switch(trick) {
                case 0:
                    let platformNumber = Platform.pool.filter(p => !p.disabled).length;
                    let platformToDel = Math.floor(random(platformNumber * 0.35, platformNumber * 0.5));
                    for(let i = 0; i < platformToDel; i++) {
                        let platform = random(Platform.pool.filter(p => !p.disabled));
                        platform.disabled = true;
                        ProjectileEffect.startEffect(ProjectileEffect, platform.pos, undefined, 0.75, 0, "black", "emptyCircle", 1, 0.3);
                    }
                    break;
                case 1:
                    let crowNumber = Math.floor(random(TrickOrTreatPlatform.CROW_NUMBER[0], TrickOrTreatPlatform.CROW_NUMBER[1]));
                    let right = random() < .5;
                    for(let i = 0; i < crowNumber; i++) {
                        let height;
                        Projectile.startEffect({x: right ? 101 : -1, y: height = this.pos.y + random(...TrickOrTreatPlatform.CROW_HEIGHT_R)},
                            {x: right ? -1 : 101, y: height}, TrickOrTreatPlatform.CROW_FLIGHT_TIME, 0.75, "black", "circle", player => {
                                player.velocity.x = distanceToVel(TrickOrTreatPlatform.CROW_STRENGTH, false) * (right ? -1 : 1);
                        });
                    }
                    break;
                case 2:
                    for(const p of Player.list) {
                        p.addEffect("invisibility", random(...TrickOrTreatPlatform.HIDE_TIME));
                    }
                    break;
            }
        }
        TextEffect.startEffect(text, {x: gameCanvas.middle.x, y: gameCanvas.middle.y}, 2, 4, 
            "black", "orangeRed", 3, undefined, true);
    }
}

class YeetPlatform extends Platform {
    static pool = [];

    static JUMP_HEIGHT = 20;
    static YEET_DISTANCE = 70;

    static MOVING_CHANCE = 0.33;
    static BOOSTER_CHANCE = 0.15;

    static newPlatform(pos, attributes = {
        moving: YeetPlatform.MOVING_CHANCE, booster: YeetPlatform.BOOSTER_CHANCE
    }) {
        return Platform.newPlatform(YeetPlatform, "Yeet", "orange", YeetPlatform.JUMP_HEIGHT, pos, attributes);
    }
    touchAction(player) {
        super.touchAction(player);
        let direction = Math.sign(this.attributes.moving);
        let pDirection = Math.sign(player.velocity.x);
        player.velocity.x += distanceToVel(YeetPlatform.YEET_DISTANCE, false) * (direction ? direction : pDirection ? pDirection : (random() < .5) * 2 - 1);
    }
}
