let page = null;

class Element {
    children = [];

    constructor(name, parent, selectable = false) {
        this.name = name;
        this.parent = parent;
        this.selectable = selectable;
        if(this.parent) {
            if(this.parent.children.filter(e => e.selectable).length && this.selectable) {
                this.parent.children.findLast(e => e.selectable).next = this;
            }
            this.parent.children.push(this);
            if(this.selectable) {
                this.next = this.parent.children.find(e => e.selectable);
            }
        }
    }

    load() {
        for(const child of this.children) {
            child.load();
        }
    }
    unload() {
        for(const child of this.children) {
            child.unload();
        }
    }
    select() {
        page.selected = this;
    }
    draw() {
        for(const child of this.children) {
            child.draw();
        }
    }
    tick(deltaTime) {
        if(!page) {
            return false;
        }
        this.draw();
        for(const child of this.children) {
            child.tick(deltaTime);
        }
    }
}
class TextElement extends Element {
    static SIZE_INCREASE = 1.3;
    static SIZE_INCREASE_TIME = 0.15;

    constructor(name, parent, text, x, y, size, color, selectable, align) {
        super(name, parent, selectable);
        this.text = text;
        this.pos = {x: x, y: y};
        this.size = this.basicSize = size;
        this.color = color;
        this.align = align;
    }
    
    updateText(newText) {
        this.text = newText;
        this.parent.draw();
    }
    draw() {
        menuCanvas.text(this.text, this.pos.x, pxToUnit(globalThis.innerHeight) - this.pos.y, this.size, this.color, this.color, this.align);
    }
    tick(deltaTime, selected = page?.selected == this, bonusSelected = page?.bonusSelect == this) {
        const deltaSize = (TextElement.SIZE_INCREASE - 1) * this.basicSize / TextElement.SIZE_INCREASE_TIME * deltaTime;
        if(((selected && !page.bonusSelect) || bonusSelected) && this.size < this.basicSize * TextElement.SIZE_INCREASE) {
            this.size += deltaSize;
        } else if((!selected || page.bonusSelect) && !bonusSelected && this.size > this.basicSize) {
            this.size -= deltaSize;
        }
        super.tick(deltaTime);
    }
    unload() {
        this.size = this.basicSize;
        super.unload();
    }
    select(disableAnimation = false) {
        super.select();
        if(disableAnimation) {
            this.size = this.basicSize * TextElement.SIZE_INCREASE;
        }
    }
}

class Page extends Element {
    #selected;

    constructor(name, color, eventFunction) {
        super(name, null);
        this.color = color;
        this.eventFunction = eventFunction;
    }
    get selected() {
        if(this.#selected == null) {
            this.#selected = this.children.filter(e => e.selectable)[0];
        }
        return this.#selected;
    }
    set selected(value) {
        this.#selected = value;
    }

    load() {
        page?.unload();
        super.load();
        page = this;
        globalThis.document.newEventListener("keydown", this.eventFunction);
        startUpdate(this.tick.bind(this));
        this.selected.select(true);
    }
    unload() {
        globalThis.document.clearEventListeners();
        page = null;
        super.unload();
    }
    select() {
        console.error(`Design error: pages (${this.name}) cannot be selected`);
    }
    draw() {
        menuCanvas.clear(this.color);
        if(Star.list.length && currentEventLook.lighting) {
            menuCanvas.drawStars(Star.list, currentEventLook.lighting.outer, currentEventLook.lighting.innerRatio);
        }
        super.draw();
    }
    tick(deltaTime) {
        if(deltaTime > 1) {
            deltaTime = 0;
        }
        super.tick(deltaTime);
        return page == this;
    }
}

class Button extends TextElement {
    constructor(name, parent, text, x, y, size, color, event, align) {
        super(name, parent, text, x, y, size, color, true, align);
        this.basicSize = size;
        this.event = event;
    }
}

class Label extends TextElement {
    constructor(name, parent, text, x, y, size, color, align) {
        super(name, parent, text, x, y, size, color, false, align);
        this.basicSize = size;
    }
}

class LabeledButton extends Element {
    constructor(name, parent, x, y, label, button, selectable = true) {
        super(name, parent, selectable);
        this.pos = {x: x, y: y};
        this.label = label;
        this.label.pos.x += this.pos.x;
        this.label.pos.y += this.pos.y;
        this.label.parent = this.parent;
        this.button = button;
        this.button.pos.x += this.pos.x;
        this.button.pos.y += this.pos.y;
        this.button.parent = this.parent;
        this.event = this.button.event;
    }

    draw() {
        this.label.draw();
        this.button.draw();
    }
    tick(deltaTime) {
        this.label.tick(deltaTime, page.selected == this, page.bonusSelect == this);
        this.button.tick(deltaTime, page.selected == this, page.bonusSelect == this);
    }
    select(disableAnimation = false) {
        super.select(disableAnimation);
        if(disableAnimation) {
            this.label.size = this.label.basicSize * TextElement.SIZE_INCREASE;
            this.button.size = this.button.basicSize * TextElement.SIZE_INCREASE;
        }
    }
}

class Star {
    static list = [];

    static SIZE = [0.005, 0.04];
    static AMOUNT = 200;

    constructor(lightSource) {
        this.x = pxToUnit(random(0, globalThis.innerWidth));
        this.y = pxToUnit(random(0, globalThis.innerHeight));
        this.distance = Math.sqrt((this.x - lightSource.x) ** 2 + (this.y - lightSource.y) ** 2);
        this.size = random(Star.SIZE[0], Star.SIZE[1]);
        Star.list.push(this);
    }

    static createStars(lightSourceX, lightSourceY) {
        for(let i = 0; i < Star.AMOUNT; i++) {
            new Star({x: lightSourceX, y: lightSourceY});
        }
    }
}

class EventLook {
    static DISABLED_BUTTON_COLOR = "grey";

    constructor(background, titleColor, buttonColors, mainButtonColor, lighting = null) {
        this.name = Date.currentEvent;
        this.background = background;
        this.titleColor = titleColor;
        this.buttonColors = buttonColors;
        this.buttonProgress = 0;
        this.mainButtonColor = mainButtonColor;
        this.lighting = lighting;
    }
    nextButtonColor(next = this.buttonProgress + 1) {
        if(next != -1) {
            this.buttonProgress = next;
            if(this.buttonProgress == this.buttonColors.length) {
                this.buttonProgress = 0;
            }
        }
        return this.buttonColors[this.buttonProgress];
    }
}
let currentEventLook, background;
switch(Date.currentEvent) {
    case "None":
        let range = globalThis.innerWidth * 0.75;
        background = menuCanvas._ctx.createRadialGradient(
            0, 0, 0,
            0, 0, range);
        background.addColorStop(0, "white");
        background.addColorStop(0.2, "indigo");
        background.addColorStop(1, "black");
        currentEventLook = new EventLook(background, "purple", ["royalblue", "steelblue"], "#205194",
            {outer: pxToUnit(range), innerRatio: 0.1});
        Star.createStars(0, 0);
        break;
    case "Halloween":
        background = menuCanvas._ctx.createRadialGradient(
            -menuCanvas.middlePx.x, globalThis.innerHeight + menuCanvas.middlePx.x * 1.5, menuCanvas.middlePx.x / 2,
            -menuCanvas.middlePx.x, globalThis.innerHeight + menuCanvas.middlePx.x * 1.5, menuCanvas.middlePx.x * 3);
        background.addColorStop(0, "yellow");
        background.addColorStop(0.5, "orangeRed");
        background.addColorStop(1, "black");
        currentEventLook = new EventLook(background, "orangeRed", ["orange", "#d97b48"], "orange");
        break;
}

const menu = new Page("mainMenu", currentEventLook.background, e => {
    switch(e.code) {
        case "Enter":
        case "NumpadEnter":
            page.selected.event();
            break;
        case "KeyS":
        case "ArrowDown":
            page.selected.next.select();
            break;
        case "KeyW":
        case "ArrowUp":
            for(let i = 0; i < page.children.filter(c => c.selectable).length - 1; i++) {
                page.selected.next.select();
            }
            break;
    }
});
new Label("title", menu, "OmegaJump", menuCanvas.middle.x, 5.5, 8, "purple");
new Label("version", menu, "Pre-release", menuCanvas.middle.x, 12, 3, "magenta");
new Label("event", menu, Date.events.None ? "" : (Date.currentEvent.replaceAll("_", " ") + ` ${date.getFullYear()}`), menuCanvas.middle.x, 16, 3, currentEventLook.titleColor);
new Button("play", menu, "Play", menuCanvas.middle.x, 25, 3, currentEventLook.nextButtonColor(0), () => {
    gameModes.load();
});
new Button("settingsMenu", menu, "Settings", menuCanvas.middle.x, 30, 3, currentEventLook.nextButtonColor(), () => {
    settings.load();
});
new Button("omegapedia", menu, "Omegapedia", gameCanvas.middle.x, 35, 3, currentEventLook.nextButtonColor(), () => {
    open("omegapedia/index.html", "_blank");
});
new Button("stories", menu, "Stories [HUN]", gameCanvas.middle.x, 40, 3, EventLook.DISABLED_BUTTON_COLOR, () => {
    console.warn("not yet implemented");
});

const settingsValues = {
    moveFps: [20, 50, 100, 500, 1000, 5000, 10_000, 50_000],
    devTools: ["disabled", "enabled"],
    textures: ["simple", "fancy"],
    showFPS: ["off", "on"]
};
const defaultsList = {
    moveFps: 0,
    devTools: 0,
    textures: 1,
    showFPS: 0
};
const settingsList = {};
for (const setting in defaultsList) {
    settingsList[setting] = storage.load(`OmegaJump_${setting}Setting`, defaultsList[setting]);
}
const settingButtons = {};
let getSettingValue = key => settingsValues[key][settingsList[key]];
let settingButtonAction = (key, prefix = "", postfix = "") => {
    settingsList[key]++;
    if(settingsList[key] >= settingsValues[key].length) {
        settingsList[key] = 0;
    }
    settingButtons[key].button.updateText(prefix + getSettingValue(key) + postfix);
};

const settings = new Page("settings", currentEventLook.background, e => {
    switch(e.code) {
        case "Enter":
        case "NumpadEnter":
            page.selected.event();
            break;
        case "Backspace":
            menu.load();
            break;
        case "KeyS":
        case "ArrowDown":
            page.selected.next.select();
            break;
        case "KeyW":
        case "ArrowUp":
            for(let i = 0; i < page.children.filter(c => c.selectable).length - 1; i++) {
                page.selected.next.select();
            }
            break;
    }
});
new Label("settingsTitle", settings, "Settings", menuCanvas.middle.x, 7, 6, currentEventLook.titleColor);
settingButtons.showFPS = new LabeledButton("showFPSSetting", settings, menuCanvas.middle.x, 20,
    new Label("showFPSLabel", null, "Show FPS:", -2, 0, 2, currentEventLook.nextButtonColor(0), "right"),
    new Button("showFPSButton", null, getSettingValue("showFPS"), 2, 0, 2, currentEventLook.nextButtonColor(-1), () => {
        settingButtonAction("showFPS");
    }, "left")
);
settingButtons.moveFps = new LabeledButton("moveFpsSetting", settings, menuCanvas.middle.x, 23.5,
    new Label("moveFpsLabel", null, "Bonus movement updates:", -2, 0, 2, currentEventLook.nextButtonColor(), "right"),
    new Button("moveFpsButton", null, `x${getSettingValue("moveFps")}`, 2, 0, 2, currentEventLook.nextButtonColor(-1), () => {
        settingButtonAction("moveFps", "x");
    }, "left")
);
settingButtons.textures = new LabeledButton("texturesSetting", settings, menuCanvas.middle.x, 27,
    new Label("texturesLabel", null, "Textures:", -2, 0, 2, currentEventLook.nextButtonColor(), "right"),
    new Button("texturesButton", null, getSettingValue("textures"), 2, 0, 2, currentEventLook.nextButtonColor(-1), () => {
        settingButtonAction("textures");
    }, "left")
);
settingButtons.devTools = new LabeledButton("devToolsSetting", settings, menuCanvas.middle.x, 30.5,
    new Label("devToolsLabel", null, "Developer tools:", -2, 0, 2, currentEventLook.nextButtonColor(), "right"),
    new Button("devToolsButton", null, getSettingValue("devTools"), 2, 0, 2, currentEventLook.nextButtonColor(-1), () => {
        settingButtonAction("devTools");
    }, "left")
);
new Button("saveSetting", settings, "Set as startup config", menuCanvas.middle.x, 40, 3, currentEventLook.nextButtonColor(), () => {
    for(const setting in settingsList) {
        storage.save(`OmegaJump_${setting}Setting`, settingsList[setting]);
    }
    //TODO: sikeres mentes megjelenitese
});
new Button("defaultSettings", settings, "Reset to defaults", menuCanvas.middle.x, 45, 3, currentEventLook.nextButtonColor(), () => {
    for(const setting in settingsList) {
        while(settingsList[setting] != defaultsList[setting]) {
            settingButtons[setting].button.event();
        }
    }
});

let playerNumber = 2;
const gameModes = new Page("gameModes", currentEventLook.background, e => {
    switch(e.code) {
        case "Enter":
        case "NumpadEnter":
            if(page.bonusSelect) {
                page.bonusSelect.event();
                break;
            }
            page.selected.event();
            break;
        case "Backspace":
            menu.load();
            break;
        case "KeyD":
        case "ArrowRight":
            page.selected.next.select();
            break;
        case "KeyA":
        case "ArrowLeft":
            for(let i = 0; i < page.children.filter(c => c.selectable).length - 1; i++) {
                page.selected.next.select();
            }
            break;
        case "KeyS":
        case "ArrowDown":
            if(!page.bonusSelect) {
                page.bonusSelect = pNum;
            }
            break;
        case "KeyW":
        case "ArrowUp":
            if(page.bonusSelect) {
                page.bonusSelect = null;
            }
            break;
    }
});
let startGame = (players, coop) => {
    gameModes.unload();
    menuCanvas.hide();
    gameCanvas.show();
    let options = {};
    for(const setting in settingsValues) {
        options[setting] = settingsValues[setting][settingsList[setting]];
    }
    init(options, players, coop);
};
new Label("gameModesTitle", gameModes, "Select a game mode!", menuCanvas.middle.x, 9, 6, currentEventLook.titleColor);
new Button("singleP", gameModes, "Single", 20, 25, 4, currentEventLook.mainButtonColor, () => {
    startGame(1, true);
});
new Button("coopP", gameModes, "Cooperative", gameCanvas.middle.x, 25, 4, currentEventLook.mainButtonColor, () => {
    startGame(playerNumber, true);
});
new Button("compP", gameModes, "Competitive", 80, 25, 4, currentEventLook.mainButtonColor, () => {
    startGame(playerNumber, false);
});
const pNum = new LabeledButton("playerNumber", gameModes, gameCanvas.middle.x, 40,
    new Label("playerNumberLabel", null, "Multiplayer:", -1, 0, 1.5, currentEventLook.nextButtonColor(0), "right"),
    new Button("playerNumberLabel", null, `${playerNumber} players`, 1, 0, 1.5, currentEventLook.nextButtonColor(-1), () => {
        playerNumber++;
        if(playerNumber > Player.CONTROL_LIST.length) {
            playerNumber = 2;
        }
        pNum.button.updateText(`${playerNumber} players`);
    }, "left"), false
);

let backToMenu = () => {
    gameCanvas.hide();
    menuCanvas.show();
    gameModes.load();
};

menuCanvas.show();
menu.load();