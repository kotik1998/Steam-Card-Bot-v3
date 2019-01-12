module.exports = {
    USERNAME: "",
    PASSWORD: "",
    SHAREDSECRET: "",
    IDENTITYSECRET: "",
    STEAMAPIKEY: "",
    INVITETOGROUPID: "", // Invite users to this group, group ID not URL. Go here to get your group ID: https://steamcommunity.com/groups/<GroupName>/memberslistxml/?xml=1
    PLAYGAMES: [":sets: Sets | Buying 21 Sets ⇆ Key | Selling 18 Sets ⇆ Key"], // NonSteam gamed being displayed on profile. 730 is number of game it will idle hours of [730 = csgo]
    COMMENTAFTERTRADE: "Thanks for using us level up service!",
    MAXHOURSADDED: 750, // The bot will remove users after 72 hours (10 week) of inactivity.
    ADMINS: ["", ""], // Repeat pattern for more admins
    KEYSFROMGAME: 730, // 730 = CSGO, 440 = TF2
    MAXMSGPERSEC: 5, // The amount of messages users can send every second without getting removed.
    CARDS: {
        BUY1KEYFORAMOUNTOFSETS: 19, // For instance; if set to 9 you sell 9 sets for 1 key.
        GIVE1KEYPERAMOUNTOFSETS: 24, // For instance; if set to 6 you give people that have access to the !sell command 1 key for 6 of their sets.
        MAXSETSELL: 500, // The maximum amount of sets of a kind the bot will send when !sell is used
    },
    MESSAGES: {
        WELCOME: "Hello there. I'm a card bot. Use !check, !buy or !help. Report any issues to http://steamcommunity.com/id/boombow",
        HELP: "If you want to know how many sets you can buy for a specific amount of keys use !check [amount of keys]. To buy sets use !buy [amount of keys].",
        SELLHELP: "You are also able to sell sets. You can do this by using !sell [amount of keys].",
        MAXLEVEL: 3000, // Max level you can request using !level
        MAXBUY: 100, // Max keys you can buy sets for at a time
        MAXSELL: 50 // Max keys you can sell sets for at a time
    },
    ACCEPTEDKEYS: [
            "Chroma 2 Case Key",
            "Huntsman Case Key",
            "Chroma Case Key",
            "eSports Key",
            "Winter Offensive Case Key",
            "Revolver Case Key",
            "Operation Vanguard Case Key",
            "Shadow Case Key",
            "Operation Wildfire Case Key",
            "Falchion Case Key",
	    "Spectrum Case Key",
            "Operation Breakout Case Key",
            "Chroma 3 Case Key",
            "CS:GO Case Key",
            "Operation Phoenix Case Key",
            "Gamma Case Key",
            "Gamma 2 Case Key",
            "Glove Case Key",
	    "Spectrum Case Key"
        ] // These are all keys ^ //Mann Co. Supply Crate Key//
}

