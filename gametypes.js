class GameType {
    static list = [];

    static SPACE_KNOCK_MAX_DISTANCE = 35;

    static BLINK_KNOCK_TP_Y = 5;

    static CHAOS_KNOCK_PUSH_R = 15;

    constructor(name, backgroundColor, god, platformList, knockFunction) {
        this.name = name;
        this.backgroundColor = backgroundColor;
        this.god = god;
        this.platformList = platformList;
        this.knockFunction = knockFunction;
        GameType.list.push(this);
    }

    choosePlatform() {
        let rand = random();
        for(const entry of this.platformList) {
            rand -= entry.chance;
            if(rand < 0) {
                return entry.constr;
            }
        }
        console.warn(`Unsuccessful choosing platform for gametype ${this.name}`);
        return BasicPlatform;
    }

    static getGameTypeByName(name) {
        return GameType.list.filter(gt => gt.name == name)[0];
    }
}

class PlatformEntry {
    constructor(constr, chance) {
        this.constr = constr;
        this.chance = chance;
    }
}

new GameType("Space", "darkblue", SpaceGod, [
    new PlatformEntry(BasicPlatform, 0.625),
    new PlatformEntry(EnergyPlatform, 0.075),
    new PlatformEntry(ConfusePlatform, 0.1),
    new PlatformEntry(TeleportingPlatform, 0.1),
    new PlatformEntry(YeetPlatform, 0.1)
], (winner, loser) => {
    winner.velocity.x = (winner.pos.x - loser.pos.x) / (winner.size + loser.size) * GameType.SPACE_KNOCK_MAX_DISTANCE;
    loser.velocity.x = (loser.pos.x - winner.pos.x) / (winner.size + loser.size) * GameType.SPACE_KNOCK_MAX_DISTANCE;
});

new GameType("Blink", "indigo", BlinkGod, [
    new PlatformEntry(BasicPlatform, 0.425),
    new PlatformEntry(EnergyPlatform, 0.075),
    new PlatformEntry(EnhancerPlatform, 0.05),
    new PlatformEntry(TeleportingPlatform, 0.35),
    new PlatformEntry(BlinkerPlatform, 0.1)
], (winner, loser) => {
    winner.teleport(random(0, 100), winner.pos.y + GameType.BLINK_KNOCK_TP_Y);
    loser.addEffect("blinking", loser.effects.blinking + 1);
});

new GameType("Chaos", "#22578B", ChaosGod, [
    new PlatformEntry(BasicPlatform, 0.625),
    new PlatformEntry(EnergyPlatform, 0.075),
    new PlatformEntry(EnhancerPlatform, 0.1),
    new PlatformEntry(CloakerPlatform, 0.1),
    new PlatformEntry(PullerPlatform, 0.05),
    new PlatformEntry(TransformerPlatform, 0.05)
], (winner, loser) => {
    let x = (winner.pos.x + loser.pos.x) / 2;
    let y = (winner.pos.y + loser.pos.y) / 2;
    let distance, vel, degree;
    for(const platform of Platform.pool) {
        if(platform.disabled) {
            continue;
        }
        distance = distanceSq(platform.pos, {x: x, y: y});
        if(distance <= GameType.CHAOS_KNOCK_PUSH_R ** 2) {
            distance = Math.sqrt(distance);
            vel = distanceToVel(GameType.CHAOS_KNOCK_PUSH_R) * (1 - distance / GameType.CHAOS_KNOCK_PUSH_R);
            degree = Math.asin((platform.pos.y - y) / distance);
            platform.velocity.y = vel * Math.sin(degree);
            platform.velocity.x = vel * Math.cos(degree) * Math.sign(platform.pos.x - x);
        }
    }
});
const transformEntries = {platformList: [
    new PlatformEntry(EnhancerPlatform, 0.25),
    new PlatformEntry(CloakerPlatform, 0.25),
    new PlatformEntry(PullerPlatform, 0.25),
    new PlatformEntry(TransformerPlatform, 0.25)
], name: "transformEntries"};
const chaosGodEntries = {platformList: [
    new PlatformEntry(EnhancerPlatform, 0.2),
    new PlatformEntry(CloakerPlatform, 0.2),
    new PlatformEntry(PullerPlatform, 0.2),
    new PlatformEntry(TransformerPlatform, 0.2),
    new PlatformEntry(YeetPlatform, 0.1),
    new PlatformEntry(ConfusePlatform, 0.1)
], name: "chaosGodEntries"};
