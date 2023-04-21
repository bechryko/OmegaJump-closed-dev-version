const G = 40;
const HORIZONTAL_G = 25;

const distanceToVel = (distance, vertical = true) => distance < 0 ? console.error("Negative distance error!") : Math.sqrt(distance * (vertical ? G : HORIZONTAL_G) / 50) * 10;

class Player {
    static CONTROL_LIST = [
        { left: "KeyA", right: "KeyD" },
        { left: "ArrowLeft", right: "ArrowRight" },
        { left: "Numpad4", right: "Numpad6" },
        { left: "KeyJ", right: "KeyL" }
    ];
    static COLOR_LIST = ["purple", "cyan", "yellow", "#5dc436"];
    static NAME_LIST = ["Navegiri", "Qohuru", "Fagau", "Jihixxa"];
  
    static number = 0;
    static maxNumber = 1;
    static list;

    static SPEED = 14;
    static SIZE = 1.6;
    static STARTING_VEL = distanceToVel(30);
    static ENERGY_SPEED_BOOST_PERCENT = 1;
    static ENERGY_JUMP_BOOST_PERCENT = 1;
    static ENERGY_DAMAGE_BOOST = 10;

    static DUEL_SCORE_RANGE = 15;
    static DUEL_SCORE_GAIN = 2;
    static KNOCK_HEIGHT = 10;
    static CHAMPION_KNOCK_ENERGY_GAIN = 2;
    static EXECUTE_HEIGHT = 15;
    static EXECUTE_ENERGY_GAIN = 1;
    static CHAMPION_EXECUTE_ENERGY_GAIN = 5;
    static KNOCK_EXP_GAIN = 15;
    static EXECUTE_EXP_GAIN = 60;
    static EXECUTE_EFFECTS_TIME = 3;
    static LEVEL_2_KNOCK_JUMP_MULTIPLIER = 1.5;
    static LEVEL_3_ENERGY_GAIN = 20;

    static BROTHER_ASSIST_HEIGHT = 7.5;
    static BROTHER_ASSIST_ENHANCE = 5;
    static BROTHER_RESURRECT_ENHANCE = 25;
    static BROTHER_OUTER_RANGE = 30;
    static BROTHER_OUTER_ENERGY_BOOST = 15;
    static BROTHER_INNER_RANGE = 10;

    pos = { x: 0, y: 0 };
    movement = { left: 0, right: 0 };
    velocity = { x: 0, y: Player.STARTING_VEL };
    size = Player.SIZE;

    effects = {
        blinking: false,
        champion: false,
        confusion: false, //TODO: visual
        invincibility: false,
        invisibility: false,
        purifying: false, //TODO, visual
    };
    static nonTimedEffects = ["blinking", "champion"];
    static nonNegativeEffects = ["champion", "invincibility", "purifying"];

    static BLINKING_TIME = 1.5;
    static BLINK_RANGE = 7.5;

    constructor(name, color, controls) {
        this.name = name;
        this.color = color;
        this.controls = controls;
        this.pos.x = 100 * ++Player.number / (Player.maxNumber + 1);
        for(let i = 0; i < 2; i++) {
            globalThis.document.newEventListener("key" + ["up", "down"][i], e => {
                if(e.code == this.controls.left) {
                    this.movement.left = i;
                } else if(e.code == this.controls.right) {
                    this.movement.right = i;
                }
            });
        }
        this.energy = 0;
        this.damage = 0;
        if(!Game.object.coop) {
            this.duel = {
                _player: this,
                health: 2,
                level: 1,
                _exp: 0,
                set exp(value) {
                    if(this.level == 3) {
                        return;
                    }
                    this._exp += (value - this._exp) / this.level;
                    if(this._exp >= 100) {
                        this._exp -= 100;
                        this._exp *= this.level / (++this.level);
                        this.health = this.level + 1;
                        if(this.level == 3) {
                            if(!Player.list.filter(p => p.effects.champion).length) {
                                this._player.addEffect("champion", true);
                            }
                            this._player.addEnergy(Player.LEVEL_3_ENERGY_GAIN);
                        }
                    }
                },
                get exp() {
                    return this._exp;
                }
            };
        } else if(Player.maxNumber > 1) {
            this.brothers = {
                _player: this,
                assist: true,
                connections: [],
                enhanceConnection(player, amount) {
                    for(const c of this.connections) {
                        if(c.players.has(player)) {
                            c.strength += amount;
                            if(c.strength - amount < 100 && c.strength >= 100) {
                                let color1 = random() < 0.5 ? this._player.color : player.color;
                                let color2 = color1 == this._player.color ? player.color : this._player.color;
                                TextEffect.startEffect("Brothers", gameCanvas.middle, 2, 4, color1, color1, 3, "right", true);
                                TextEffect.startEffect(" in arms", gameCanvas.middle, 2, 4, color2, color2, 3, "left", true);
                            }
                            return;
                        }
                    }
                },
                areBrothersInArms(player) {
                    for(const c of this.connections) {
                        if(c.players.has(player)) {
                            return c.strength >= 100;
                        }
                    }
                },
                isBrotherInRange(range) {
                    for(const player of Player.list) {
                        if(player == this._player || !this.areBrothersInArms(player) || distanceSq(player.pos, this._player.pos) > range ** 2) {
                            continue;
                        }
                        return player.alive;
                    }
                    return false;
                }
            };
            for(const player of Player.list) {
                if(player == this) {
                    continue;
                }
                let newConnection = new Brothers(this, player);
                this.brothers.connections.push(newConnection);
                player.brothers.connections.push(newConnection);
            }
        }
        this.alive = true;
    }

    jump(jumpHeight) {
        let energy = this.energy;
        if(this.brothers) {
            this.brothers.assist = true;
            if(this.brothers.isBrotherInRange(Player.BROTHER_OUTER_RANGE)) {
                energy += Player.BROTHER_OUTER_ENERGY_BOOST;
            }
        }
        this.velocity.y = distanceToVel(jumpHeight) * (energy / 100 * Player.ENERGY_JUMP_BOOST_PERCENT + 1);
    }
    refreshEffects(deltaTime) {
        for(const effectKey in this.effects) {
            if(Player.nonTimedEffects.includes(effectKey)) {
                continue;
            }
            this.addEffect(effectKey, Math.max(this.effects[effectKey] - deltaTime, 0));
        }
        return this;
    }
    move(deltaTime, gravity = G) {
        this.pos.x += (this.movement.right - this.movement.left) * Player.SPEED * deltaTime * (this.energy / 100 * Player.ENERGY_SPEED_BOOST_PERCENT + 1) * (this.effects.confusion ? -1 : 1);
        this.pos.x += this.velocity.x * deltaTime;
        this.velocity.x -= Math.sign(this.velocity.x) * HORIZONTAL_G * deltaTime;
        if(this.pos.x < 0) {
            this.pos.x = 0;
            this.velocity.x *= -1;
        } else if(this.pos.x > 100) {
            this.pos.x = 100;
            this.velocity.x *= -1;
        }
        this.pos.y += (this.velocity.y -= gravity * deltaTime) * deltaTime;
        if(this.effects.blinking && random() < 1 / Player.BLINKING_TIME * deltaTime) {
            this.teleport(this.pos.x + random(-Player.BLINK_RANGE, Player.BLINK_RANGE), this.pos.y + random(-Player.BLINK_RANGE, Player.BLINK_RANGE));
            this.addEffect("blinking", this.effects.blinking - 1);
        }
        return this;
    }
    teleport(x, y) {
        TeleportLine.startEffect(this.pos.x, x, this.pos.y, y, this.color);
        this.pos.x = x;
        this.pos.y = y;
    }
    draw(screen) {
        if(this.effects.invisibility) {
            return;
        }
        gameCanvas.drawPlayer(this, screen);
        if(Game.object.dev.rangeIndicator) { 
            if(!Game.object.coop && this.duel.level < 3) {
                gameCanvas.circle(this.pos.x, this.pos.y - screen, Player.DUEL_SCORE_RANGE, this.duel.close ? "green" : "red");
            } else if(this.brothers) {
                gameCanvas.circle(this.pos.x, this.pos.y - screen, Player.BROTHER_OUTER_RANGE, this.brothers.isBrotherInRange(Player.BROTHER_OUTER_RANGE) ? "green" : "red");
                gameCanvas.circle(this.pos.x, this.pos.y - screen, Player.BROTHER_INNER_RANGE, this.brothers.isBrotherInRange(Player.BROTHER_INNER_RANGE) ? "green" : "red");
            }
        }
    }
    doTouch(player) {
        return distanceSq(this.pos, player.pos) <= (this.size + player.size) ** 2;
    }
    knock(otherPlayer) {
        otherPlayer.duel.health--;
        let knockJumpMultiplier = this.duel.level >= 2 ? Player.LEVEL_2_KNOCK_JUMP_MULTIPLIER : 1;
        if(otherPlayer.duel.health > 0) {
            this.duel.exp += Player.KNOCK_EXP_GAIN;
            this.jump(Player.KNOCK_HEIGHT * knockJumpMultiplier);
            otherPlayer.velocity.y = -distanceToVel(Player.KNOCK_HEIGHT);
            this.addEnergy(otherPlayer.effects.champion ? Player.CHAMPION_KNOCK_ENERGY_GAIN : 0);
            otherPlayer.addEffect("invincibility", Math.max(0.1, otherPlayer.effects.invincibility));
        } else {
            this.duel.exp += Player.EXECUTE_EXP_GAIN;
            this.jump(Player.EXECUTE_HEIGHT * knockJumpMultiplier);
            otherPlayer.velocity.y = -distanceToVel(Player.EXECUTE_HEIGHT);
            this.addEnergy(otherPlayer.effects.champion ? Player.CHAMPION_EXECUTE_ENERGY_GAIN : Player.EXECUTE_ENERGY_GAIN);
            otherPlayer.addEffect("confusion", otherPlayer.effects.confusion + Player.EXECUTE_EFFECTS_TIME);
            otherPlayer.addEffect("invincibility", otherPlayer.effects.invincibility + Player.EXECUTE_EFFECTS_TIME);
            otherPlayer.duel.health = otherPlayer.duel.level + 1;
        }
        Game.object.gameType.knockFunction(this, otherPlayer);
    }
    addEnergy(amount, energyAnimation = true) {
        if(Player.COLOR_LIST.length > 1) {
            energyAnimation = false;
        }
        let size = amount < 5 ? "tiny" : amount < 10 ? "medium" : "huge", sizeValue;
        switch(size) {
            case "tiny":
                sizeValue = 0.1;
                break;
            case "medium":
                sizeValue = 0.5;
                break;
            case "huge":
                sizeValue = 1;
                break;
        }
        for(let i = 0; i < amount; i++) {
            this.energy++;
            if(energyAnimation && !(this.energy % 10)) {
                //TODO: fix animation smoothness
                TextEffect.startEffect(`Energy: ${this.energy}`, gameCanvas.middle, 2, 4, 
                    EnergyPlatform.UNCHARGED_COLOR, EnergyPlatform.CHARGED_COLOR, 3, undefined, true);
            }
        }
        ProjectileEffect.startEffect(ProjectileEffect, this.pos, undefined, 0.3, this.size, EnergyPlatform.CHARGED_COLOR, "emptyCircle", this.size * 1.75, sizeValue);
    }
    addDamage(amount) {
        this.damage += amount;
        ProjectileEffect.startEffect(ProjectileEffect, this.pos, undefined, 0.3, this.size, EnergyPlatform.DAMAGE_COLOR, "emptyCircle", this.size * 1.75, 0.1);
    }
    addEffect(effect, value) {
        if(this.brothers?.isBrotherInRange?.(Player.BROTHER_OUTER_RANGE)) {
            if(!Player.nonNegativeEffects.includes(effect)) {
                this.effects[effect] = false;
                return;
            }
        }
        this.effects[effect] = value;
    }
}

class Brothers {
    constructor(player1, player2) {
        this.players = new Set([player1, player2]);
        this.strength = 0;
    }
}
