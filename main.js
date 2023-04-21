class Game {
    static SCREEN_REACH_CEIL_PX = globalThis.innerHeight * 0.7;
    static PLATFORM_PREGEN_DISTANCE = 1.2;

    object;

    static create(settings, coop, gameTypeLock, gameType, devOptions) {
        Game.object = new Game(coop, gameTypeLock, gameType, devOptions);
        Game.settings = settings;
        if(Game.settings.devTools == "enabled") {
            globalThis.document.newEventListener("keydown", e => {
                switch(e.code) {
                    case "Comma":
                        Game.object.globalSpeed = 0.5;
                        break;
                    case "Period":
                        Game.object.globalSpeed = 1;
                        break;
                    case "Slash":
                        Game.object.globalSpeed = 2;
                        break;
                    case "ControlLeft":
                        Game.object.dev.immortality = !Game.object.dev.immortality;
                        break;
                    case "ShiftLeft":
                        Game.object.dev.rangeIndicator = !Game.object.dev.rangeIndicator;
                        break;
                    case "ShiftRight":
                        Game.object.dev.attributeInspector = !Game.object.dev.attributeInspector;
                        break;
                    case "Space":
                        Game.object.dev.paused = !Game.object.dev.paused;
                }
            });
        }
    }
    constructor(coop, gameTypeLock, gameType, devOptions) {
        this.coop = coop;
        this.gameTypeLock = gameTypeLock;
        this.gameType = gameType;
        this.god = null;
        this.screen = 0;
        this.score = 0;
        this.globalSpeed = 1;
        this.dev = devOptions ?? {
            paused: false,
            immortality: false,
            rangeIndicator: false,
            attributeInspector: false
        };
        this.continue = true;
        this.frameTimes = [];
        this.graveyard = [];
    }

    addScore(amount) {
        this.score += amount;
        //TODO: animation
    }
    get totalScore() {
        return this.screen + this.score;
    }
    static flip() {
        for(const platform of Platform.pool) {
            if(platform.disabled) {
                continue;
            }
            platform.pos.x = 100 - platform.pos.x;
            platform.attributes.moving = -platform.attributes.moving;
        }
        for(const player of Player.list) {
            if(!player.alive) {
                continue;
            }
            player.teleport(100 - player.pos.x, player.pos.y);
        }
    }
}

function game(deltaTime) {
    if(deltaTime > 1 || Game.object.dev.paused) {
        deltaTime = 0;
    }
    Game.object.frameTimes.push(deltaTime);
    let time = 0;
    for(const t of Game.object.frameTimes) {
        time += t;
    }
    if(time > 1) {
        time -= Game.object.frameTimes.splice(0)[0];
    }
    deltaTime *= Game.object.globalSpeed;
    fixPlatforms();
    let frDeltaTime = deltaTime / Game.settings.moveFps;
    for(let bonusTick = 0; bonusTick < Game.settings.moveFps; bonusTick++) {
        for(const platform of Platform.pool) {
            if(platform.disabled) {
                continue;
            }
            platform.move(frDeltaTime);
            if(platform.attributes.spreading) {
                platform.spread(frDeltaTime);
            }
            for(const projectile of Projectile.pool) {
                if(!projectile.disabled && platform.doTouch(projectile)) {
                    projectile.platformTouch?.(platform);
                }
            }
        }
        for(let i = 0; i < Player.list.length; i++) {
            const player = Player.list[i];
            if(!player.alive) {
                continue;
            }
            player.refreshEffects(frDeltaTime).move(frDeltaTime, Game.object.god?.gravity);
            if(Game.object.dev.immortality && player.pos.y <= Game.object.screen + player.size) {
                player.jump(Platform.GENERAL_JUMP_HEIGHT);
            }
            for(const platform of Platform.pool) {
                if(!platform.disabled) {
                    if(platform.attributes.projection) {
                        if(platform.doTouch(player)) {
                            platform.pos.x -= platform.attributes.projection.x;
                            platform.pos.y -= platform.attributes.projection.y;
                            platform.setAttribute("projection", false);
                            platform.setAttribute("invisible", false);
                        }
                        if((platform.doTouch.bind(platform.makeCopy(platform.attributes.projection, -1)))(player)) {
                            platform.touchAction(player);
                        }
                    } else if(platform.doTouch(player)) {
                        platform.touchAction(player);
                    }
                }
            }
            for(let j = 0; j < Player.list.length; j++) {
                const otherPlayer = Player.list[j];
                if(!otherPlayer.alive || i == j) {
                    continue;
                }
                if(player.doTouch(otherPlayer)) {
                    if(!Game.object.coop && j > i) {
                        let winner = player.pos.y > otherPlayer.pos.y || (player.pos.y == otherPlayer.pos.y && random() < .5) ? player : otherPlayer;
                        let loser = winner == otherPlayer ? player : otherPlayer;
                        if(!loser.effects.invincibility) {
                            winner.knock(loser);
                        } else {
                            loser.addEffect("invincibility", Math.max(loser.effects.invincibility, 0.1));
                        }
                    } else if(player.movement.left && player.movement.right && player.brothers?.assist) {
                        player.brothers.enhanceConnection(otherPlayer, Player.BROTHER_ASSIST_ENHANCE);
                        otherPlayer.jump(Player.BROTHER_ASSIST_HEIGHT);
                        player.brothers.assist = otherPlayer.brothers.assist = false;
                    }
                }
            }
            for(const projectile of Projectile.pool) {
                if(!projectile.disabled && player.doTouch(projectile)) {
                    projectile.playerTouch?.(player);
                }
            }
        }
        if(Game.object.god) {
            Game.object.god.attack(frDeltaTime, Game.object.screen);
        }
    }
    if(!Game.object.coop) {
        for(let i = 0; i < Player.list.length; i++) {
            Player.list[i].duel.close = 0;
            for(let j = 0; j < Player.list.length; j++) {
                if(i == j) {
                    continue;
                }
                if(distanceSq(Player.list[i].pos, Player.list[j].pos) <= Player.DUEL_SCORE_RANGE ** 2) {
                    Player.list[i].duel.close++;
                }
            }
            Player.list[i].duel.exp += Player.DUEL_SCORE_GAIN * Player.list[i].duel.close * deltaTime;
        }
    }
    for(const effect of Effect.pool) {
        if(effect.disabled) {
            continue;
        }
        effect.tick(deltaTime);
    }
    for(const platform of Platform.pool.filter(p => p.animations.length)) {
        for(const animation of platform.animations) {
            animation.update(deltaTime);
        }
    }
    let alivePlayers = 0;
    for(const p of Player.list) {
        if(!p.alive) {
            continue;
        }
        alivePlayers += (p.alive = (p.pos.y > Game.object.screen - Player.SIZE) || Game.object.dev.immortality);
        if(!p.alive) {
            Game.object.graveyard.push(p);
        }
    }
    moveScreen();
    if(!Game.object.god && Game.object.coop) {
        God.health += God.HEALTH_PER_SEC * Player.list.length * deltaTime;
        if(Game.object.totalScore >= God.AWAKE_SCORE) {
            Game.object.god = new Game.object.gameType.god();
        }
    }
    gameCanvas.clear(Game.object.gameType.backgroundColor);
    gameCanvas.drawObjects([...[...Platform.pool, ...Effect.pool].filter(o => !o.disabled), ...Player.list], Game.object.screen);
    let fps = Game.settings.showFPS == "on" ? Math.round(Game.object.frameTimes.length / time) : null;
    gameCanvas.drawUI(Game.object.gameType.name, Math.floor(Game.object.totalScore), fps, Game.settings.moveFps, Game.object.dev, Game.object.coop ? Game.object.god : Player.list);

    return alivePlayers > !Game.object.coop;
}

function fixPlatforms() {
    while(Game.object.screen + pxToUnit(globalThis.innerHeight * Game.PLATFORM_PREGEN_DISTANCE) > Platform.highest.y + Platform.nextSpaceBetween) {
        let platformType = Game.object.gameType.choosePlatform();
        if(platformType == EnergyPlatform) {
            if(Game.object.god) {
                platformType = GodSlayerPlatform;
            } else if(Date.events.Halloween && random() < TrickOrTreatPlatform.TRANSFORM_CHANCE) {
                platformType = TrickOrTreatPlatform;
            }
        }
        if(Game.object.coop && Game.object.graveyard.length && random() < ResurrectionPlatform.SPAWN_CHANCE) {
            platformType = ResurrectionPlatform;
        }
        let x;
        do {
            x = random(Platform.WIDTH, 100 - Platform.WIDTH);
        } while(Math.abs(x - Platform.highest.x) < 25);
        let platform = platformType.newPlatform({x: x, y: Platform.highest.y + Platform.nextSpaceBetween});
        if(!Platform.pool.includes(platform)) {
            Platform.pool.push(platform);
        }
        Platform.highest.x = x;
        if(random() >= Platform.DOUBLE_CHANCE) {
            Platform.highest.y += Platform.nextSpaceBetween;
        }
        Platform.nextSpaceBetween = random(Platform.SPACE_BETWEEN[0], Platform.SPACE_BETWEEN[1]);
    }
    for(const platform of Platform.pool) {
        if(!platform.disabled && platform.pos.y < Game.object.screen - platform.width * 2) {
            platform.disabled = true;
        }
    }
}

function moveScreen() { //TODO: smooth screen movement
    let screenReachCeil = pxToUnit(Game.SCREEN_REACH_CEIL_PX);
    for(const p of Player.list) {
        if(p.pos.y > Game.object.screen + screenReachCeil) {
            Game.object.screen = p.pos.y - screenReachCeil;
        }
    }
}

function init(settings, playerNumber = 1, coop, gameType, devOptions) {
    playerNumber = Math.min(playerNumber, Player.CONTROL_LIST.length);

    Game.create(settings, coop, !!gameType, gameType ? gameType : random(GameType.list), devOptions);
  
    Player.list = [];
    Player.number = 0;
    Player.maxNumber = playerNumber;
    for(let i = 0; i < Player.maxNumber; i++) {
        Player.list.push(new Player(Player.NAME_LIST[i], Player.COLOR_LIST[i], Player.CONTROL_LIST[i]));
    }

    Platform.pool = [];
    Platform.highest = {x: -100, y: 0};
    Platform.nextSpaceBetween = Platform.SPACE_BETWEEN[1];

    Effect.pool = [];

    God.health = God.STARTING_HEALTH;
    
    startUpdate(game, lose);
}

function lose() {
    globalThis.document.clearEventListeners();
    if(Game.object.coop) {
        gameCanvas.text("Game Over!", gameCanvas.middle.x, gameCanvas.middle.y, 10, "black", "red");
    } else {
        let winner = Player.list.filter(p => p.alive);
        if(!winner.length) {
            gameCanvas.text(`No one wins!`, gameCanvas.middle.x, gameCanvas.middle.y, 10, "black", "white");
        } else {
            winner = winner[0];
            gameCanvas.text(`${winner.name} wins!`, gameCanvas.middle.x, gameCanvas.middle.y, 10, "black", winner.color);
        }
    }

    globalThis.document.newEventListener("keydown", e => {
        switch(e.code) {
            case "Space":
                globalThis.document.clearEventListeners();
                init(Game.settings, Player.maxNumber, Game.object.coop, Game.object.gameTypeLock ? Game.object.gameType : undefined, Game.object.dev);
                break;
            case "Backspace":
                globalThis.document.clearEventListeners();
                backToMenu();
                break;
        }
    });
    if(Game.settings.devTools == "enabled") {
        globalThis.document.newEventListener("keydown", e => {
            if(e.code == "Delete") {
                Game.object.gameTypeLock = false;
            }
            if(e.key >= 0 && e.key < GameType.list.length) {
                Game.object.gameType = GameType.list[e.key];
                Game.object.gameTypeLock = true;
            }
        });
    }
}


function distanceSq(pos1, pos2) {
    return (pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2;
}
function findClosestPlayer(pos, mode = 1) {
    // mode: 0 - horizontal, 1 - euclidean, 2 - vertical
    let closest = Player.list[0];
    for(const p of Player.list) {
        if((mode < 2 ? pos.x - p.pos.x : 0) ** 2 + (mode > 0 ? pos.y - p.pos.y : 0) ** 2 <
        (mode < 2 ? pos.x - closest.pos.x : 0) ** 2 + (mode > 0 ? pos.y - closest.pos.y : 0) ** 2) {
            closest = p;
        }
    }
    return closest;
}
function findNClosest(pos, n = 1, array = Platform.pool) {
    let closest = [];
    for(const p of array) {
        closest.push(p);
        if(closest.length <= n) {
            continue;
        }
        let furthest = 0;
        for(let i = 1; i < closest.length; i++) {
            if(distanceSq(pos, closest[furthest].pos) < distanceSq(pos, closest[i].pos)) {
                furthest = i;
            }
        }
        closest.splice(furthest, 1);
    }
    return closest;
}