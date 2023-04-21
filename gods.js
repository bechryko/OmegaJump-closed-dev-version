class God {
    static AWAKE_SCORE = 3000;
    static ANIMATION_TIME = 3;

    static STARTING_HEALTH = 1000;
    static HEALTH_PER_SEC = 5;
    static health;

    #cooldown;
    constructor(gametype, passiveAttack, activeAttack, cooldown, mainColor) {
        this.gametype = gametype;
        this.health = God.health;
        this.maxHealth = this.health;
        this.passiveAttack = passiveAttack;
        this.activeAttack = activeAttack;
        this.#cooldown = cooldown + God.ANIMATION_TIME;
        this.totalCooldown = cooldown;
        this.mainColor = mainColor;
        this.awake();
    }

    awake() {
        TextEffect.startEffect(`The ${this.gametype.name} God has awoken!`, {x: gameCanvas.middle.x, y: gameCanvas.middle.y}, God.ANIMATION_TIME,
            6, "black", this.mainColor, 4, undefined, true);
    }
    attack(deltaTime, screen) {
        this.cooldown -= deltaTime;
        if(this.cooldown <= 0) {
            this.cooldown = this.totalCooldown;
            this.activeAttack(screen);
        }
    }
    damage(dmg) {
        this.health -= dmg;
    }

    set cooldown(value) {
        if(Array.isArray(value)) {
            this.#cooldown = random(value[0], value[1]);
        } else {
            this.#cooldown = value;
        }
    }
    get cooldown() {
        return this.#cooldown;
    }
}

class SpaceGod extends God {
    gravity = G;
    constructor() {
        super(GameType.getGameTypeByName("Space"),
            (player, platform) => {
                if(random() < 0.33) { //TODO: jo ez?
                    platform.disabled = true;
                }
            }, () => {
                this.gravity = G * random(0.5, 1.5);
            }, 5, "#001c61"
        );
    }
}

class BlinkGod extends God {
    static ACTIVE_TELEPORT_MAX_BONUS_HEIGHT = 10;

    constructor() {
        super(GameType.getGameTypeByName("Blink"),
            (player, platform) => {
                player.teleport(random(0, 100), player.pos.y);
            }, (screen) => {
                for(const platform of Platform.pool) {
                    if(platform.disabled) {
                        continue;
                    }
                    platform.pos.x = random(0, 100);
                    platform.pos.y = random(screen, Platform.highest.y);
                }
                for(const player of Player.list) {
                    if(!player.alive) {
                        continue;
                    }
                    player.teleport(random(0, 100), player.pos.y + random(0, BlinkGod.ACTIVE_TELEPORT_MAX_BONUS_HEIGHT));
                }
            }, 10, "#EE82EE"
        );
    }
}

class ChaosGod extends God {
    constructor() {
        super(GameType.getGameTypeByName("Chaos"),
            (player, platform) => {
                Game.flip();
            }, () => {
                for(const platform of Platform.pool) {
                    if(platform.disabled) {
                        continue;
                    }
                    platform.transform(chaosGodEntries);
                }
            }, 12, "#82E076"
        );
    }
}
