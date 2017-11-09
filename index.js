let SteamUser = require("steam-user"),
    SteamTotp = require("steam-totp"),
    TradeOfferManager = require("steam-tradeoffer-manager"),
    SteamCommunity = require("steamcommunity"),
    Utils = require("./utils.js"),
    CONFIG = require("./SETTINGS/config.js"),
    allCards = {},
    botSets = {},
    fs = require("fs"),
    users = {},
    userMsgs = {},
    SID64REGEX = new RegExp(/^[0-9]{17}$/),
    chatLogs = "",
    userLogs = {},
    totalBotSets = 0;


let client = new SteamUser(),
    manager = new TradeOfferManager({
        "steam": client,
        "language": "en",
        "pollInterval": "10000",
        "cancelTime": "7200000" // 2 hours in ms
    }),
    community = new SteamCommunity();

fs.readFile("./UserData/Users.json", (ERR, DATA) => {
    if (ERR) {
        console.log("## An error occurred while getting Users: " + ERR);
    } else {
        users = JSON.parse(DATA);
    }
});

Utils.getCardsInSets((ERR, DATA) => {
    if (!ERR) {
        allCards = DATA;
        console.log("Card data loaded. [" + Object.keys(DATA).length + "]");
    } else {
        console.log("An error occurred while getting cards: " + ERR);
    }
});

setInterval(() => {
    for (let i = 0; i < Object.keys(users).length; i++) {
        if (users[Object.keys(users)[i]].idleforhours >= CONFIG.MAXHOURSADDED) {
            client.chatMessage(Object.keys(users)[i], "Hi, you have been inactive on my friends list for too long. If you wish to use this bot again re-add it.");
            client.removeFriend(Object.keys(users)[i]);
            delete users[Object.keys(users)[i]];
            fs.writeFile("./UserData/Users.json", JSON.stringify(users), (ERR) => {
                if (ERR) {
                    console.log("## An error occurred while writing UserData file: " + ERR);
                }
            });
        } else {
            users[Object.keys(users)[i]].idleforhours += 1;
            fs.writeFile("./UserData/Users.json", JSON.stringify(users), (ERR) => {
                if (ERR) {
                    console.log("## An error occurred while writing UserData file: " + ERR);
                }
            });
        }
    }
}, 1000 * 60 * 60);

setInterval(() => {
    for (let i = 0; i < Object.keys(userMsgs).length; i++) {
        if (userMsgs[Object.keys(userMsgs)[i]] > CONFIG.MAXMSGPERSEC) {
            client.chatMessage(Object.keys(userMsgs)[i], "You have been removed for spamming. Another offense will get you blocked.");
            client.removeFriend(Object.keys(userMsgs)[i]);
            for (let j = 0; j < CONFIG.ADMINS.length; j++) {
                client.chatMessage(CONFIG.ADMINS[j], "User #" + Object.keys(userMsgs)[i] + " has been removed for spamming. To block him use !block [STEAMID64]");
            }
        }
    }
    userMsgs = {};
}, 1000);

client.logOn({
    accountName: CONFIG.USERNAME,
    password: CONFIG.PASSWORD,
    twoFactorCode: SteamTotp.getAuthCode(CONFIG.SHAREDSECRET)
});

client.on("loggedOn", (details, parental) => {
    client.getPersonas([client.steamID], (personas) => {
        console.log("## Logged in as #" + client.steamID + " (" + personas[client.steamID].player_name + ")");
    });
    client.setPersona(1);
});

client.on("webSession", (sessionID, cookies) => {
    manager.setCookies(cookies, (ERR) => {
        if (ERR) {
            console.log("## An error occurred while setting cookies.");
        } else {
            console.log("## Websession created and cookies set.");
        }
    });
    community.setCookies(cookies);
    community.startConfirmationChecker(10000, CONFIG.IDENTITYSECRET);
    Utils.getInventory(client.steamID.getSteamID64(), community, (ERR, DATA) => {
        console.log("DEBUG#INVLOADED");
        if (!ERR) {
            let s = DATA;
            Utils.getSets(s, allCards, (ERR, DATA) => {
                console.log("DEBUG#SETSLOADED");
                if (!ERR) {
                    botSets = DATA;
                    console.log("## Bot's sets loaded.");
                    let botNSets = 0;
                    for (let i = 0; i < Object.keys(botSets).length; i++) {
                        botNSets += botSets[Object.keys(botSets)[i]].length;
                    }
                    totalBotSets = botNSets;
                    let playThis = CONFIG.PLAYGAMES;
                    if (CONFIG.PLAYGAMES && typeof(CONFIG.PLAYGAMES[0]) == "string") {
                        playThis[0] = parseString(playThis[0], totalBotSets);
                    }
                    client.gamesPlayed(playThis);
                } else {
                    console.log("## An error occurred while getting bot sets: " + ERR);
                    process.exit();
                }
            });
        } else {
            console.log("## An error occurred while getting bot inventory: " + ERR);
        }
    });
});

community.on("sessionExpired", (ERR) => {
    console.log("## Session Expired. Relogging.");
    client.webLogOn();
});

client.on("friendMessage", (SENDER, MSG) => {
    if (userLogs[SENDER.getSteamID64()]) {
        userLogs[SENDER.getSteamID64()].push(MSG);
    } else {
        userLogs[SENDER.getSteamID64()] = [];
        userLogs[SENDER.getSteamID64()].push(MSG);
    }
    fs.writeFile("./ChatLogs/UserLogs/" + SENDER.getSteamID64() + "-log-" + new Date().getDate() + "-" + new Date().getMonth() + "-" + new Date().getFullYear() + ".json", JSON.stringify({ logs: userLogs[SENDER.getSteamID64()] }), (ERR) => {
        if (ERR) {
            console.log("## An error occurred while writing UserLogs file: " + ERR);
        }
    });
    chatLogs += SENDER.getSteamID64() + " : " + MSG + "\n";
    fs.writeFile("./ChatLogs/FullLogs/log-" + new Date().getDate() + "-" + new Date().getMonth() + "-" + new Date().getFullYear() + ".txt", chatLogs, (ERR) => {
        if (ERR) {
            console.log("## An error occurred while writing FullLogs file: " + ERR);
        }
    });
    if (Object.keys(users).indexOf(SENDER.getSteamID64()) < 0) {
        users[SENDER.getSteamID64()] = {};
        users[SENDER.getSteamID64()].idleforhours = 0;
        fs.writeFile("./UserData/Users.json", JSON.stringify(users), (ERR) => {
            if (ERR) {
                console.log("## An error occurred while writing UserData file: " + ERR);
            }
        });
    } else {
        users[SENDER.getSteamID64()].idleforhours = 0;
    }
    if (userMsgs[SENDER.getSteamID64()]) {
        userMsgs[SENDER.getSteamID64()]++;
    } else {
        userMsgs[SENDER.getSteamID64()] = 1;
    }
    /*if (MSG.toUpperCase() == "!STOCK") {
        for (let i = 0; i < botSets.length; i++) {
            //
        }
    } else */
    if (MSG.toUpperCase().indexOf("!LEVEL") >= 0) {
        let n = parseInt(MSG.toUpperCase().replace("!LEVEL ", ""));
        if (!isNaN(n) && parseInt(n) > 0) {
            if (n <= CONFIG.MESSAGES.MAXLEVEL) {
                Utils.getBadges(SENDER.getSteamID64(), (ERR, DATA, CURRENTLEVEL, XPNEEDED) => {
                    if (!ERR) {
                        if (DATA) {
                            if (n > CURRENTLEVEL) {
                                let s = 0,
                                    l = 0;
                                for (let i = 0; i < (n - CURRENTLEVEL); i++) {
                                    s += parseInt((CURRENTLEVEL + l) / 10) + 1;
                                    l++;
                                }
                                client.chatMessage(SENDER, "Levelup bot: To get to level " + n + " you will need " + (s - Math.floor(XPNEEDED / 100)) + " sets. That would cost " + parseInt((s - Math.floor(XPNEEDED / 100)) / CONFIG.CARDS.BUY1KEYFORAMOUNTOFSETS * 100) / 100 + " keys.");
                            } else {
                                client.chatMessage(SENDER, "Levelup bot: Please provide a valid level.");
                            }
                        } else {
                            client.chatMessage(SENDER, "Levelup bot: Your level could not be retrieved. Make sure your Steam Profile is public and try again.");
                        }
                    } else {
                        console.log("## An error occurred while getting badge data: " + ERR);
                        client.chatMessage(SENDER, "An error occurred while loading your badges. Please try again later.");
                    }
                });
            } else {
                client.chatMessage(SENDER, "Please try a lower level.");
            }
        } else {
            client.chatMessage(SENDER, "Please provide a valid level.");
        }
    } 
	else if (MSG.toUpperCase() == "!HELP") {
		client.chatMessage(SENDER, " \n !CHECK = Checking how many uncrafted sets you can buy from the current Bot. \n !CHECK [X] = Checking how many Cardsets you can buy for [X] CS:GO Keys. \n !BUYANY [X] = Buy any Cardsets for [X] CS:GO Keys. \n !BUY [X] = Buy uncrafted Cardsets for [X] CS:GO Keys. \n !SELLCHECK = Checking for Sets the Bot can buy from you. You recieve CS:GO Keys for your Cardsets. \n !SELL [X] = Sell Cardsets and get [X] CS:GO Keys. \n !LEVEL [X] = Will check how many Cardsets you need to reach Level [X]. \n !KEYLIST = Shows all tradeable Keys. \n !OWNER = Show the Owners Account. \n !INVITE = Sends you an invite to our Steamgroup. \n !WEBSITE = Sends a link to our Website.");
	}
	else if (MSG.toUpperCase() == "!KEYLIST") {
		client.chatMessage(SENDER, '\n We accept the following Keys: \n \n CS:GO Case Key \n Chroma Case Key \n Chroma 2 Case Key \n Chroma 3 Case Key \n eSports Key \n Falchion Case Key \n Gamma Case Key \n Gamma 2 Case Key \n Glove Case Key \n Huntsman Case Key \n Hydra Case Key \n Operation Breakout Case Key \n Operation Phoenix Case Key \n Operation Vanguard Case Key \n Operation Wildfire Case Key \n Revolver Case Key \n Shadow Case Key \n Spectrum Case Key \n Spectrum 2 Case Key \n Winter Offensive Case Key');
	}
	else if (MSG.toUpperCase() == "!WEBSITE") {
		client.chatMessage(SENDER, CONFIG.WEBSITE);
	}
	else if (MSG.toUpperCase() == "!OWNER") {
        client.chatMessage(SENDER, CONFIG.OWNER);
    }
	else if (MSG.toUpperCase() == "!INVITE") {
		client.inviteToGroup(SENDER.getSteamID64(),CONFIG.INVITETOGROUPID);
		console.log("[ UserChat ] INVITED:", SENDER.getSteamID64(), "TO:", CONFIG.INVITETOGROUPID);
    } else if (MSG.toUpperCase().indexOf("!BUYONECHECK") >= 0) {
        client.chatMessage(SENDER, "Loading badges...");
        Utils.getBadges(SENDER.getSteamID64(), (ERR, DATA) => {
            if (!ERR) {
                let b = {}; // List with badges that CAN still be crafted
                if (DATA) {
                    for (let i = 0; i < Object.keys(DATA).length; i++) {
                        if (DATA[Object.keys(DATA)[i]] < 6) {
                            b[Object.keys(DATA)[i]] = 5 - DATA[Object.keys(DATA)[i]];
                        }
                    }
                } else {
                    client.chatMessage(SENDER.getSteamID64(), "Your badges are empty, sending an offer without checking badges.");
                }
                // console.log(b);
                // TODO: COUNT AMOUNT OF SETS BOT CAN GIVE HIM
                // 1: GET BOTS CARDS. DONE
                // 2: GET PLAYER's BADGES. DONE
                // 3: MAGIC
                let hisMaxSets = 0,
                    botNSets = 0;
                // Loop for sets he has partially completed
                for (let i = 0; i < Object.keys(b).length; i++) {
                    if (botSets[Object.keys(b)[i]] && botSets[Object.keys(b)[i]].length >= 5 - b[Object.keys(b)[i]].length) {
                        hisMaxSets += 5 - b[Object.keys(b)[i]].length;
                    }
                }
                // Loop for sets he has never crafted
                for (let i = 0; i < Object.keys(botSets).length; i++) {
                    if (Object.keys(b).indexOf(Object.keys(botSets)[i]) < 0) {
                        if (botSets[Object.keys(botSets)[i]].length >= 1) {
                            hisMaxSets += 1;
                        }
                    }
                    botNSets += botSets[Object.keys(botSets)[i]].length;
                }
                totalBotSets = botNSets;
                let playThis = CONFIG.PLAYGAMES;
                if (CONFIG.PLAYGAMES && typeof(CONFIG.PLAYGAMES[0]) == "string") {
                    playThis[0] = parseString(playThis[0], totalBotSets);
                }
                client.gamesPlayed(playThis);
                client.chatMessage(SENDER, "There are currently sets from " + Object.keys(botSets).length + " different games, of which you have not crafted " + hisMaxSets + ". This would cost " + parseInt(hisMaxSets / CONFIG.CARDS.BUY1KEYFORAMOUNTOFSETS * 100) / 100 + " keys.");
            } else {
                client.chatMessage(SENDER, "An error occurred while getting your badges. Please try again.");
                console.log("An error occurred while getting badges: " + ERR);
            }
        });
    } 
	else if (MSG.toUpperCase().indexOf("!SELLCHECK") >= 0) {
        let n = parseInt(MSG.toUpperCase().replace("!SELLCHECK ",""));
        client.chatMessage(SENDER, "Loading your inventory...");

        Utils.getInventory(SENDER.getSteamID64(), community, (ERR, DATA) => {
            console.log("[  DEBUG  ] Inventory loaded");
            if (!ERR) {
                let s = DATA;
                Utils.getSets(s, allCards, (ERR, DATA) => {
                    console.log("[  DEBUG  ] Sets loaded");
                    if (!ERR) {
                        // console.log(b);
                        // TODO: COUNT AMOUNT OF SETS BOT CAN GIVE HIM
                        // 1: GET BOTS CARDS. DONE
                        // 2: GET PLAYER's BADGES. DONE
                        // 3: MAGIC
                        let hisMaxSets = 0,
                            botNSets = 0;
                        // Loop for sets he has partially completed
                        // Loop for sets he has never crafted
                        for (let i = 0; i < Object.keys(DATA).length; i++) {
                            if (DATA[Object.keys(DATA)[i]].length >= 5) {
                                hisMaxSets += 5;
                            } 
							else {
                                hisMaxSets += DATA[Object.keys(DATA)[i]].length;
                            }
                            botNSets += DATA[Object.keys(DATA)[i]].length;
                        }
                        totalBotSets = botNSets;
                        let playThis = CONFIG.PLAYGAMES;
                        if (CONFIG.PLAYGAMES && typeof(CONFIG.PLAYGAMES[0]) == "string") {
                            playThis[0] = parseString(playThis[0], totalBotSets);
                        }
                        client.gamesPlayed(playThis);
                        client.chatMessage(SENDER, "You currently have " + botNSets + " sets available which the bot can buy. For all of them the bot will pay you " + parseInt(botNSets / CONFIG.CARDS.GIVE1KEYPERAMOUNTOFSETS * 100) / 100 + " keys.");
                    } 
					else {
                        console.log("[  DEBUG  ] An error occurred while getting user sets: " + ERR);
                    }
                });
            } 
			else {
                console.log("[  DEBUG  ] An error occurred while getting user inventory: " + ERR);
            }
        });
    } else if (MSG.toUpperCase().indexOf("!CHECK") >= 0) {
        let n = parseInt(MSG.toUpperCase().replace("!CHECK ", ""));
        if (!isNaN(n) && parseInt(n) > 0) {
            client.chatMessage(SENDER, "With " + n + " keys you can get " + n * CONFIG.CARDS.BUY1KEYFORAMOUNTOFSETS + " sets.");
        } else {
            if (Object.keys(botSets).length > 0) {
                client.chatMessage(SENDER, "Loading badges...");
                Utils.getBadges(SENDER.getSteamID64(), (ERR, DATA) => {
                    if (!ERR) {
                        let b = {}; // List with badges that CAN still be crafted
                        if (DATA) {
                            for (let i = 0; i < Object.keys(DATA).length; i++) {
                                if (DATA[Object.keys(DATA)[i]] < 6) {
                                    b[Object.keys(DATA)[i]] = 5 - DATA[Object.keys(DATA)[i]];
                                }
                            }
                        } else {
                            client.chatMessage(SENDER.getSteamID64(), "Your badges are empty, sending an offer without checking badges.");
                        }
                        // console.log(b);
                        // TODO: COUNT AMOUNT OF SETS BOT CAN GIVE HIM
                        // 1: GET BOTS CARDS. DONE
                        // 2: GET PLAYER's BADGES. DONE
                        // 3: MAGIC
                        let hisMaxSets = 0,
                            botNSets = 0;
                        // Loop for sets he has partially completed
                        for (let i = 0; i < Object.keys(b).length; i++) {
                            if (botSets[Object.keys(b)[i]] && botSets[Object.keys(b)[i]].length >= 5 - b[Object.keys(b)[i]].length) {
                                hisMaxSets += 5 - b[Object.keys(b)[i]].length;
                            }
                        }
                        // Loop for sets he has never crafted
                        for (let i = 0; i < Object.keys(botSets).length; i++) {
                            if (Object.keys(b).indexOf(Object.keys(botSets)[i]) < 0) {
                                if (botSets[Object.keys(botSets)[i]].length >= 5) {
                                    hisMaxSets += 5;
                                } else {
                                    hisMaxSets += botSets[Object.keys(botSets)[i]].length;
                                }
                            }
                            botNSets += botSets[Object.keys(botSets)[i]].length;
                        }
                        totalBotSets = botNSets;
                        let playThis = CONFIG.PLAYGAMES;
                        if (CONFIG.PLAYGAMES && typeof(CONFIG.PLAYGAMES[0]) == "string") {
                            playThis[0] = parseString(playThis[0], totalBotSets);
                        }
                        client.gamesPlayed(playThis);
                        client.chatMessage(SENDER, "There are currently " + hisMaxSets + "/" + botNSets + " sets available which you have not fully crafted yet. Buying all of them will cost you " + parseInt(hisMaxSets / CONFIG.CARDS.BUY1KEYFORAMOUNTOFSETS * 100) / 100 + " keys.");
                    } else {
                        client.chatMessage(SENDER, "An error occurred while getting your badges. Please try again.");
                        console.log("An error occurred while getting badges: " + ERR);
                    }
                });
            } else {
                client.chatMessage(SENDER, "Please try again later.");
            }
        }
    } 
	else if (MSG.toUpperCase().indexOf("!SELL") >= 0) {
        if (botSets) {
                let n = parseInt(MSG.toUpperCase().replace("!SELL ","")),
                amountofsets = n * CONFIG.CARDS.GIVE1KEYPERAMOUNTOFSETS;
                if (!isNaN(n) && parseInt(n) > 0) {
                    if (n <= CONFIG.MESSAGES.MAXSELL) {
                        client.chatMessage(SENDER, "Processing your request.");
                        let botKeys = [],
                            t = manager.createOffer(SENDER.getSteamID64());
                        t.getUserDetails((ERR, ME, THEM) => {
                            if (ERR) {
                                console.log("[  DEBUG  ] An error occurred while getting trade holds: " + ERR);
                                client.chatMessage(SENDER, "An error occurred while getting your trade holds. Make sure you have no trade hold. Please try again!");
                            } 
							else if (ME.escrowDays == 0 && THEM.escrowDays == 0) {
                                manager.getUserInventoryContents(client.steamID.getSteamID64(), CONFIG.KEYSFROMGAME, 2, true, (ERR, INV, CURR) => {
                                    if (ERR) {
                                        console.log("[  DEBUG  ] An error occurred while getting bot inventory: " + ERR);
                                        client.chatMessage(SENDER, "An error occurred while loading the bot's inventory. Please try again.");
                                    } 
									else {
                                        for (let i = 0; i < INV.length; i++) {
                                            if (botKeys.length < n && CONFIG.ACCEPTEDKEYS.indexOf(INV[i].market_hash_name) >= 0) {
                                                botKeys.push(INV[i]);
                                            }
                                        }
                                        if (botKeys.length != n) {
                                            client.chatMessage(SENDER, "The bot does not have enough keys.");
                                        } 
										else {
                                            let amountofB = amountofsets;
                                            Utils.getInventory(SENDER.getSteamID64(), community, (ERR, DATA) => {
                                                if (!ERR) {
                                                    let s = DATA;
                                                    Utils.getSets(s, allCards, (ERR, DDATA) => {
                                                        if (!ERR) {
                                                            sortSetsByAmountB(s, (DATA) => {
                                                                let setsSent = {};
                                                                firsttLoop: for (let i = 0; i < DATA.length; i++) {
                                                                    console.log(setsSent);
                                                                    console.log(DATA[i]);
                                                                    if (DDATA[DATA[i]]) {
                                                                        for (let j = 0; j < DDATA[DATA[i]].length; j++) {
                                                                            if (amountofB > 0) {
                                                                                if ((setsSent[DATA[i]] && setsSent[DATA[i]] < CONFIG.CARDS.MAXSETSELL) || !setsSent[DATA[i]]) {
                                                                                    t.addTheirItems(DDATA[DATA[i]][j]);
                                                                                    console.log("[  DEBUG  ] #2 CONTINUE: ITEM ADD");
                                                                                    amountofB--;
                                                                                    if (!setsSent[DATA[i]]) {
                                                                                        setsSent[DATA[i]] = 1;
                                                                                    } 
																					else {
                                                                                        setsSent[DATA[i]] += 1;
                                                                                    }
                                                                                } 
																				else {
                                                                                    console.log("[  DEBUG  ] #2 CONTINUE: RETURN");
                                                                                    continue firsttLoop;
                                                                                }
                                                                            } 
																			else {
                                                                                console.log("[  DEBUG  ] #2 CONTINUE: RETURN");
                                                                                continue firsttLoop;
                                                                            }
                                                                        }
                                                                    } 
																	else {
                                                                        console.log("[  DEBUG  ] #2 CONTINUE: RETURN 2");
                                                                        continue firsttLoop;
                                                                    }
                                                                }
                                                            });
                                                            if (amountofB > 0) {
                                                                client.chatMessage(SENDER, "You do not have enough sets, (this bot only accepts " + CONFIG.CARDS.MAXSETSELL + " sets per set type at a time). Please try again later.");
                                                            } 
															else {
                                                                console.log("[  DEBUG  ] Sending Trade");
                                                                t.addMyItems(botKeys);
																t.setMessage(CONFIG.MESSAGES.TRADEMSG);
                                                                t.data("commandused", "Sell");
                                                                t.data("amountofsets", amountofsets.toString());
                                                                t.data("amountofkeys", n);
                                                                t.send((ERR, STATUS) => {
                                                                    if (ERR) {
                                                                        client.chatMessage(SENDER, "An error occurred while sending your trade. Steam Trades could be down. Please try again later.");
                                                                        console.log("[  DEBUG  ] An error occurred while sending trade: " + ERR);
                                                                    } 
																	else {
                                                                        client.chatMessage(SENDER, "Trade Sent! Confirming it...");
                                                                        console.log("[  DEBUG  ] Trade offer sent!");
                                                                    }
                                                                });
                                                            }
                                                        } 
														else {
                                                            console.log("[  DEBUG  ] An error occurred while getting bot sets: " + ERR);
                                                        }
                                                    });
                                                } 
												else {
                                                    console.log("[  DEBUG  ] An error occurred while getting user inventory: " + ERR);
                                                }
                                            });
                                        }
                                    }
                                });
                            } 
							else {
                                client.chatMessage(SENDER, "Please make sure you don't have a trade hold!");
                            }
                        });
                    } 
					else {
                        client.chatMessage(SENDER, "Please try a lower amount of keys.");
                    }
                } 
				else {
                    client.chatMessage(SENDER, "Please enter a valid amount of keys!");
                }
        } 
		else {
            client.chatMessage(SENDER, "Please try again later.");
        }
    } else if (MSG.toUpperCase().indexOf("!BUYONE") >= 0) {
        if (botSets) {
            let n = MSG.toUpperCase().replace("!BUYONE ", ""),
                amountofsets = parseInt(n) * CONFIG.CARDS.BUY1KEYFORAMOUNTOFSETS;
            if (!isNaN(n) && parseInt(n) > 0) {
                if (n <= CONFIG.MESSAGES.MAXBUY) {
                    let t = manager.createOffer(SENDER.getSteamID64());
                    t.getUserDetails((ERR, ME, THEM) => {
                        if (ERR) {
                            console.log("## An error occurred while getting trade holds: " + ERR);
                            client.chatMessage(SENDER, "An error occurred while getting your trade holds. Please try again");
                        } else if (ME.escrowDays == 0 && THEM.escrowDays == 0) {
                            n = parseInt(n);
                            let theirKeys = [];
                            client.chatMessage(SENDER, "Processing your request.");
                            manager.getUserInventoryContents(SENDER.getSteamID64(), CONFIG.KEYSFROMGAME, 2, true, (ERR, INV, CURR) => {
                                if (ERR) {
                                    console.log("## An error occurred while getting inventory: " + ERR);
                                    client.chatMessage(SENDER, "An error occurred while loading your inventory. Please try later");
                                } else {
                                    console.log("DEBUG#INV LOADED");
                                    if (!ERR) {
                                        console.log("DEBUG#INV LOADED NOERR");
                                        for (let i = 0; i < INV.length; i++) {
                                            if (theirKeys.length < n && CONFIG.ACCEPTEDKEYS.indexOf(INV[i].market_hash_name) >= 0) {
                                                theirKeys.push(INV[i]);
                                            }
                                        }
                                        if (theirKeys.length != n) {
                                            client.chatMessage(SENDER, "You do not have enough keys.");
                                        } else {
                                            Utils.getBadges(SENDER.getSteamID64(), (ERR, DATA) => {
                                                if (!ERR) {
                                                    console.log("DEBUG#BADGE LOADED");
                                                    if (!ERR) {
                                                        let b = {}; // List with badges that CAN still be crafted
                                                        if (DATA) {
                                                            for (let i = 0; i < Object.keys(DATA).length; i++) {
                                                                if (DATA[Object.keys(DATA)[i]] < 6) {
                                                                    b[Object.keys(DATA)[i]] = 5 - DATA[Object.keys(DATA)[i]];
                                                                }
                                                            }
                                                        } else {
                                                            client.chatMessage(SENDER.getSteamID64(), "Your badges are empty, sending an offer without checking badges.");
                                                        }
                                                        console.log(DATA);
                                                        console.log(b);
                                                        // TODO: COUNT AMOUNT OF SETS BOT CAN GIVE HIM
                                                        // 1: GET BOTS CARDS. DONE
                                                        // 2: GET PLAYER's BADGES. DONE
                                                        // 3: MAGIC
                                                        let hisMaxSets = 0,
                                                            botNSets = 0;
                                                        // Loop for sets he has partially completed
                                                        for (let i = 0; i < Object.keys(b).length; i++) {
                                                            if (botSets[Object.keys(b)[i]] && botSets[Object.keys(b)[i]].length >= 5 - b[Object.keys(b)[i]].length) {
                                                                hisMaxSets += 5 - b[Object.keys(b)[i]].length;
                                                            }
                                                        }
                                                        console.log("DEBUG#LOOP 1 DONE");
                                                        // Loop for sets he has never crafted
                                                        for (let i = 0; i < Object.keys(botSets).length; i++) {
                                                            if (Object.keys(b).indexOf(Object.keys(botSets)[i]) < 0) {
                                                                if (botSets[Object.keys(botSets)[i]].length >= 5) {
                                                                    hisMaxSets += 5;
                                                                } else {
                                                                    hisMaxSets += botSets[Object.keys(botSets)[i]].length;
                                                                }
                                                            }
                                                            botNSets += botSets[Object.keys(botSets)[i]].length;
                                                        }
                        totalBotSets = botNSets;
                        let playThis = CONFIG.PLAYGAMES;
                        if (CONFIG.PLAYGAMES && typeof(CONFIG.PLAYGAMES[0]) == "string") {
                            playThis[0] = parseString(playThis[0], totalBotSets);
                        }
                        client.gamesPlayed(playThis);
                                                        console.log("DEBUG#LOOP 2 DONE");
                                                        // HERE
                                                        if (amountofsets <= hisMaxSets) {
                                                            hisMaxSets = amountofsets;
                                                            console.log("DEBUG#TRADE CREATED");
                                                            sortSetsByAmount(botSets, (DATA) => {
                                                                console.log("DEBUG#" + DATA);
                                                                console.log("DEBUG#SETS SORTED");
                                                                firstLoop: for (let i = 0; i < DATA.length; i++) {
                                                                    if (b[DATA[i]] == 0) {
                                                                        continue firstLoop;
                                                                    } else {
                                                                        console.log("DEBUG#" + i);
                                                                        console.log("DEBUG#FOR LOOP ITEMS");
                                                                        if (hisMaxSets > 0) {
                                                                            console.log("DEBUG#MAXSETSMORETHAN1");
                                                                            if (!b[DATA[i]] && botSets[DATA[i]].length > 0) { // TODO NOT FOR LOOP WITH BOTSETS. IT SENDS ALL
                                                                                // BOT HAS ENOUGH SETS AND USER NEVER CRAFTED THIS
                                                                                bLoop: for (let j = 0; j < botSets[DATA[i]].length; j++) {
                                                                                    if (botSets[DATA[i]][j] && hisMaxSets > 0) {
                                                                                        t.addMyItems(botSets[DATA[i]][j]);
                                                                                        console.log("DEBUG#LOOP #2 CONTINUE: ITEM ADD");
                                                                                        hisMaxSets--;
                                                                                        continue firstLoop;
                                                                                    } else {
                                                                                        console.log("DEBUG#LOOP #2 CONTINUE: RETURN");
                                                                                        continue firstLoop;
                                                                                    }
                                                                                }
                                                                            }
                                                                        } else {
                                                                            console.log("DEBUG#RETURN");
                                                                            break firstLoop;
                                                                        }
                                                                    }
                                                                }
                                                                if (hisMaxSets > 0) {
                                                                    client.chatMessage(SENDER, "There are not enough sets. Please try again later.");
                                                                } else {
                                                                    console.log("DEBUG#SENDING");
                                                                    t.addTheirItems(theirKeys);
                                                                    t.data("commandused", "BuyOne");
                                                                    t.data("amountofkeys", n);
                                                                    t.data("amountofsets", amountofsets.toString());
                                                                    t.send((ERR, STATUS) => {
                                                                        if (ERR) {
                                                                            client.chatMessage(SENDER, "An error occurred while sending your trade. Steam Trades could be down. Please try again later.");
                                                                            console.log("## An error occurred while sending trade: " + ERR);
                                                                        } else {
                                                                            client.chatMessage(SENDER, "Trade Sent! Confirming it...");
                                                                            console.log("## Trade offer sent");
                                                                        }
                                                                    });
                                                                }
                                                            });
                                                        } else {
                                                            client.chatMessage(SENDER, "There are currently not enough sets that you have not used in stock for this amount of keys. Please try again later. If you want the bot to ignore your current badges use !buyany.");
                                                        }
                                                        // TO HERE
                                                    } else {
                                                        console.log("An error occurred while getting badges: " + ERR);
                                                    }
                                                } else {
                                                    client.chatMessage(SENDER, "An error occurred while getting your badges. Please try again.");
                                                    console.log(SENDER, "## An error occurred while loading badges: " + ERR);
                                                }
                                            });
                                        }
                                    } else {
                                        console.log("## An error occurred while getting inventory: " + ERR);
                                        client.chatMessage(SENDER, "An error occurred while loading your inventory, please make sure it's set to public.");
                                    }
                                }
                            });
                        } else {
                            client.chatMessage(SENDER, "Please make sure you don't have a trade hold!");
                        }
                    });
                } else {
                    client.chatMessage(SENDER, "Please try a lower amount of keys.");
                }
            } else {
                client.chatMessage(SENDER, "Please provide a valid amount of keys.");
            }
        } else {
            client.chatMessage(SENDER, "Please try again later.");
        }
    } else if (MSG.toUpperCase().indexOf("!BUYANY") >= 0) {
        if (botSets) {
            let n = MSG.toUpperCase().replace("!BUYANY ", ""),
                amountofsets = parseInt(n) * CONFIG.CARDS.BUY1KEYFORAMOUNTOFSETS;
            if (!isNaN(n) && parseInt(n) > 0) {
                if (n <= CONFIG.MESSAGES.MAXBUY) {
                    let t = manager.createOffer(SENDER.getSteamID64());
                    n = parseInt(n);
                    let theirKeys = [];
                    t.getUserDetails((ERR, ME, THEM) => {
                        if (ERR) {
                            console.log("## An error occurred while getting trade holds: " + ERR);
                            client.chatMessage(SENDER, "An error occurred while getting your trade holds. Please try again");
                        } else if (ME.escrowDays == 0 && THEM.escrowDays == 0) {
                            client.chatMessage(SENDER, "Processing your request.");
                            manager.getUserInventoryContents(SENDER.getSteamID64(), CONFIG.KEYSFROMGAME, 2, true, (ERR, INV, CURR) => {
                                if (ERR) {
                                    console.log("## An error occurred while getting inventory: " + ERR);
                                    client.chatMessage(SENDER, "An error occurred while loading your inventory. Please try later");
                                } else {
                                    let amountofB = amountofsets;
                                    for (let i = 0; i < INV.length; i++) {
                                        if (theirKeys.length < n && CONFIG.ACCEPTEDKEYS.indexOf(INV[i].market_hash_name) >= 0) {
                                            theirKeys.push(INV[i]);
                                        }
                                    }
                                    if (theirKeys.length != n) {
                                        client.chatMessage(SENDER, "You do not have enough keys.");
                                    } else {
                                        sortSetsByAmount(botSets, (DATA) => {
                                            let setsSent = {};
                                            firstLoop: for (let i = 0; i < DATA.length; i++) {
                                                console.log(setsSent);
                                                console.log(DATA[i]);
                                                if (botSets[DATA[i]]) {
                                                    for (let j = 0; j < botSets[DATA[i]].length; j++) {
                                                        if (amountofB > 0) {
                                                            if ((setsSent[DATA[i]] && setsSent[DATA[i]] < 5) || !setsSent[DATA[i]]) {
                                                                t.addMyItems(botSets[DATA[i]][j]);
                                                                console.log("DEBUG#LOOP #2 CONTINUE: ITEM ADD");
                                                                amountofB--;
                                                                if (!setsSent[DATA[i]]) {
                                                                    setsSent[DATA[i]] = 1;
                                                                } else {
                                                                    setsSent[DATA[i]] += 1;
                                                                }
                                                            } else {
                                                                console.log("DEBUG#LOOP #2 CONTINUE: RETURN");
                                                                continue firstLoop;
                                                            }
                                                        } else {
                                                            console.log("DEBUG#LOOP #2 CONTINUE: RETURN");
                                                            continue firstLoop;
                                                        }
                                                    }
                                                } else {
                                                    console.log("DEBUG#LOOP #2 CONTINUE: RETURN 2");
                                                    continue firstLoop;
                                                }
                                            }
                                        });
                                    }
                                    if (amountofB > 0) {
                                        client.chatMessage(SENDER, "There are not enough sets. Please try again later.");
                                    } else {
                                        console.log("DEBUG#SENDING");
                                        t.addTheirItems(theirKeys);
                                        t.data("commandused", "BuyAny");
                                        t.data("amountofsets", amountofsets.toString());
                                        t.data("amountofkeys", n);
                                        t.send((ERR, STATUS) => {
                                            if (ERR) {
                                                client.chatMessage(SENDER, "An error occurred while sending your trade. Steam Trades could be down. Please try again later.");
                                                console.log("## An error occurred while sending trade: " + ERR);
                                            } else {
                                                client.chatMessage(SENDER, "Trade Sent! Confirming it...");
                                                console.log("## Trade offer sent!");
                                            }
                                        });
                                    }
                                }
                            });
                        } else {
                            client.chatMessage(SENDER, "Please make sure you don't have a trade hold!");
                        }
                    });
                } else {
                    client.chatMessage(SENDER, "Please try a lower amount of keys");
                }
            } else {
                client.chatMessage(SENDER, "Please provide a valid amount of keys.");
            }
        } else {
            client.chatMessage(SENDER, "Please try again later.");
        }
    } else if (MSG.toUpperCase().indexOf("!BUY") >= 0) {
        if (botSets) {
            let n = MSG.toUpperCase().replace("!BUY ", ""),
                amountofsets = parseInt(n) * CONFIG.CARDS.BUY1KEYFORAMOUNTOFSETS;
            if (!isNaN(n) && parseInt(n) > 0) {
                if (n <= CONFIG.MESSAGES.MAXBUY) {
                    let t = manager.createOffer(SENDER.getSteamID64());
                    t.getUserDetails((ERR, ME, THEM) => {
                        if (ERR) {
                            console.log("## An error occurred while getting trade holds: " + ERR);
                            client.chatMessage(SENDER, "An error occurred while getting your trade holds. Please try again");
                        } else if (ME.escrowDays == 0 && THEM.escrowDays == 0) {
                            n = parseInt(n);
                            let theirKeys = [];
                            client.chatMessage(SENDER, "The bot is currently processing your request, please give it some time.");
                            manager.getUserInventoryContents(SENDER.getSteamID64(), CONFIG.KEYSFROMGAME, 2, true, (ERR, INV, CURR) => {
                                if (ERR) {
                                    console.log("## An error occurred while getting inventory: " + ERR);
                                    client.chatMessage(SENDER, "An error occurred while loading your inventory. Please try later");
                                } else {
                                    console.log("DEBUG#INV LOADED");
                                    if (!ERR) {
                                        console.log("DEBUG#INV LOADED NOERR");
                                        for (let i = 0; i < INV.length; i++) {
                                            if (theirKeys.length < n && CONFIG.ACCEPTEDKEYS.indexOf(INV[i].market_hash_name) >= 0) {
                                                theirKeys.push(INV[i]);
                                            }
                                        }
                                        if (theirKeys.length != n) {
                                            client.chatMessage(SENDER, "Error: You don't have enough keys. Feel free to come back when you collect more keys.");
                                        } else {
                                            Utils.getBadges(SENDER.getSteamID64(), (ERR, DATA) => {
                                                if (!ERR) {
                                                    console.log("DEBUG#BADGE LOADED");
                                                    if (!ERR) {
                                                        let b = {}; // List with badges that CAN still be crafted
                                                        if (DATA) {
                                                            for (let i = 0; i < Object.keys(DATA).length; i++) {
                                                                if (DATA[Object.keys(DATA)[i]] < 6) {
                                                                    b[Object.keys(DATA)[i]] = 5 - DATA[Object.keys(DATA)[i]];
                                                                }
                                                            }
                                                        } else {
                                                            client.chatMessage(SENDER.getSteamID64(), "Your badges are empty, sending an offer without checking badges.");
                                                        }
                                                        console.log(DATA);
                                                        console.log(b);
                                                        // TODO: COUNT AMOUNT OF SETS BOT CAN GIVE HIM
                                                        // 1: GET BOTS CARDS. DONE
                                                        // 2: GET PLAYER's BADGES. DONE
                                                        // 3: MAGIC
                                                        let hisMaxSets = 0,
                                                            botNSets = 0;
                                                        // Loop for sets he has partially completed
                                                        for (let i = 0; i < Object.keys(b).length; i++) {
                                                            if (botSets[Object.keys(b)[i]] && botSets[Object.keys(b)[i]].length >= 5 - b[Object.keys(b)[i]].length) {
                                                                hisMaxSets += 5 - b[Object.keys(b)[i]].length;
                                                            }
                                                        }
                                                        console.log("DEBUG#LOOP 1 DONE");
                                                        // Loop for sets he has never crafted
                                                        for (let i = 0; i < Object.keys(botSets).length; i++) {
                                                            if (Object.keys(b).indexOf(Object.keys(botSets)[i]) < 0) {
                                                                if (botSets[Object.keys(botSets)[i]].length >= 5) {
                                                                    hisMaxSets += 5;
                                                                } else {
                                                                    hisMaxSets += botSets[Object.keys(botSets)[i]].length;
                                                                }
                                                            }
                                                            botNSets += botSets[Object.keys(botSets)[i]].length;
                                                        }
                                                        console.log("DEBUG#LOOP 2 DONE");
                                                        // HERE
                                                        if (amountofsets <= hisMaxSets) {
                                                            hisMaxSets = amountofsets;
                                                            console.log("DEBUG#TRADE CREATED");
                                                            sortSetsByAmount(botSets, (DATA) => {
                                                                console.log("DEBUG#" + DATA);
                                                                console.log("DEBUG#SETS SORTED");
                                                                firstLoop: for (let i = 0; i < DATA.length; i++) {
                                                                    if (b[DATA[i]] == 0) {
                                                                        continue firstLoop;
                                                                    } else {
                                                                        console.log("DEBUG#" + i);
                                                                        console.log("DEBUG#FOR LOOP ITEMS");
                                                                        if (hisMaxSets > 0) {
                                                                            console.log("DEBUG#MAXSETSMORETHAN1");
                                                                            if (b[DATA[i]] && botSets[DATA[i]].length >= b[DATA[i]]) {
                                                                                // BOT HAS ENOUGH SETS OF THIS KIND
                                                                                console.log("DEBUG#LOOP #1");
                                                                                sLoop: for (let j = 0; j < 5 - b[DATA[i]]; j++) {
                                                                                    if (j + 1 < b[DATA[i]] && hisMaxSets > 0) {
                                                                                        console.log("DEBUG#LOOP #1: ITEM ADD");
                                                                                        console.log("DEBUG#LOOP #1: " + botSets[DATA[i]][j]);
                                                                                        t.addMyItems(botSets[DATA[i]][j]);
                                                                                        hisMaxSets--;
                                                                                        console.log(hisMaxSets);
                                                                                    } else {
                                                                                        console.log("DEBUG#LOOP #1: RETURN");
                                                                                        continue firstLoop;
                                                                                    }
                                                                                }
                                                                            } else if (b[DATA[i]] && botSets[DATA[i]].length < b[DATA[i]]) {
                                                                                // BOT DOESNT HAVE ENOUGH SETS OF THIS KIND
                                                                                console.log("DEBUG#LOOP #1 CONTINUE");
                                                                                continue; // *
                                                                            } else if (!b[DATA[i]] && botSets[DATA[i]].length < 5 && botSets[DATA[i]].length - b[DATA[i]] > 0) { // TODO NOT FOR LOOP WITH BOTSETS. IT SENDS ALL
                                                                                // BOT HAS ENOUGH SETS AND USER NEVER CRAFTED THIS
                                                                                bLoop: for (let j = 0; j < botSets[DATA[i]].length - b[DATA[i]]; j++) {
                                                                                    if (botSets[DATA[i]][j] && hisMaxSets > 0) {
                                                                                        t.addMyItems(botSets[DATA[i]][j]);
                                                                                        console.log("DEBUG#LOOP #2 CONTINUE: ITEM ADD");
                                                                                        hisMaxSets--;
                                                                                    } else {
                                                                                        console.log("DEBUG#LOOP #2 CONTINUE: RETURN");
                                                                                        continue firstLoop;
                                                                                    }
                                                                                }
                                                                            }
                                                                            else if (hisMaxSets < 5) {
                                                                                // BOT DOESNT HAVE CARDS USER AREADY CRAFTED, IF USER STILL NEEDS 5 SETS:
                                                                                console.log("DEBUG#LOOP #2");
                                                                                tLoop: for (let j = 0; j != hisMaxSets; j++) {
                                                                                    if (botSets[DATA[i]][j] && hisMaxSets > 0) {
                                                                                        t.addMyItems(botSets[DATA[i]][j]);
                                                                                        console.log("DEBUG#LOOP #2: ITEM ADD");
                                                                                        hisMaxSets--;
                                                                                        console.log(hisMaxSets);
                                                                                    } else {
                                                                                        console.log("DEBUG#LOOP #2: RETURN");
                                                                                        continue firstLoop;
                                                                                    }
                                                                                }
                                                                            } else {
                                                                                // BOT DOESNT HAVE CARDS USER AREADY CRAFTED, IF USER STILL NEEDS LESS THAN 5 SETS:
                                                                                console.log("DEBUG#LOOP #2");
                                                                                xLoop: for (let j = 0; j != 5; j++ && hisMaxSets > 0) {
                                                                                    if (botSets[DATA[i]][j] && hisMaxSets > 0) {
                                                                                        t.addMyItems(botSets[DATA[i]][j]);
                                                                                        console.log("DEBUG#LOOP #2: ITEM ADD");
                                                                                        hisMaxSets--;
                                                                                        console.log(hisMaxSets);
                                                                                    } else {
                                                                                        console.log("DEBUG#LOOP #2: RETURN");
                                                                                        continue firstLoop;
                                                                                    }
                                                                                }
                                                                            }
                                                                        } else {
                                                                            console.log("DEBUG#RETURN");
                                                                            break firstLoop;
                                                                        }
                                                                    }
                                                                }
                                                                if (hisMaxSets > 0) {
                                                                    client.chatMessage(SENDER, "There are not enough sets. Please try again later.");
                                                                } else {
                                                                    console.log("DEBUG#SENDING");
                                                                    t.addTheirItems(theirKeys);
                                                                    t.data("commandused", "Buy");
                                                                    t.data("amountofkeys", n);
                                                                    t.data("amountofsets", amountofsets.toString());
                                                                    t.send((ERR, STATUS) => {
                                                                        if (ERR) {
                                                                            client.chatMessage(SENDER, "An error occurred while sending your trade. Steam Trades could be down. Please try again later.");
                                                                            console.log("## An error occurred while sending trade: " + ERR);
                                                                        } else {
                                                                            client.chatMessage(SENDER, "Trade Sent! Confirming it...");
                                                                            console.log("## Trade offer sent");
                                                                        }
                                                                    });
                                                                }
                                                            });
                                                        } else {
                                                            client.chatMessage(SENDER, "There are currently not enough sets that you have not used in stock for this amount of keys. Please try again later. If you want the bot to ignore your current badges use !buyany.");
                                                        }
                                                        // TO HERE
                                                    } else {
                                                        console.log("An error occurred while getting badges: " + ERR);
                                                    }
                                                } else {
                                                    client.chatMessage(SENDER, "An error occurred while getting your badges. Please try again.");
                                                    console.log(SENDER, "## An error occurred while loading badges: " + ERR);
                                                }
                                            });
                                        }
                                    } else {
                                        console.log("## An error occurred while getting inventory: " + ERR);
                                        client.chatMessage(SENDER, "An error occurred while loading your inventory, please make sure it's set to public.");
                                    }
                                }
                            });
                        } else {
                            client.chatMessage(SENDER, "Please make sure you don't have a trade hold!");
                        }
                    });
                } else {
                    client.chatMessage(SENDER, "Please try a lower amount of keys.");
                }
            } else {
                client.chatMessage(SENDER, "Error: Please provide a valid amount of keys.");
            }
        } else {
            client.chatMessage(SENDER, "Please try again later.");
        }
    } else if (MSG.toUpperCase() == "!PROOF") {
        client.chatMessage(SENDER, "b0gotac @ github");
    } else if (CONFIG.ADMINS.indexOf(SENDER.getSteamID64()) >= 0 || CONFIG.ADMINS.indexOf(parseInt(SENDER.getSteamID64())) >= 0) {
        // Admin commands.
        if (MSG.toUpperCase().indexOf("!BLOCK") >= 0) {
            let n = MSG.toUpperCase().replace("!BLOCK ", "").toString();
            if (SID64REGEX.test(n)) {
                client.chatMessage(SENDER, "User blocked.");
                client.blockUser(n);
            } else {
                client.chatMessage(SENDER, "Please provide a valid SteamID64");
            }
        } else if (MSG.toUpperCase().indexOf("!USERCHECK") >= 0) {
            let n = MSG.toUpperCase().replace("!USERCHECK ", "").toString();
            if (SID64REGEX.test(n)) {
                if (Object.keys(botSets).length > 0) {
                    client.chatMessage(SENDER, "Loading badges...");
                    Utils.getBadges(n, (ERR, DATA) => {
                        if (!ERR) {
                            let b = {}; // List with badges that CAN still be crafted
                            if (DATA) {
                                for (let i = 0; i < Object.keys(DATA).length; i++) {
                                    if (DATA[Object.keys(DATA)[i]] < 6) {
                                        b[Object.keys(DATA)[i]] = 5 - DATA[Object.keys(DATA)[i]];
                                    }
                                }
                            } else {
                                client.chatMessage(SENDER.getSteamID64(), n + "'s badges are empty, sending an offer without checking badges.");
                            }
                            // console.log(b);
                            // TODO: COUNT AMOUNT OF SETS BOT CAN GIVE HIM
                            // 1: GET BOTS CARDS. DONE
                            // 2: GET PLAYER's BADGES. DONE
                            // 3: MAGIC
                            let hisMaxSets = 0,
                                botNSets = 0;
                            // Loop for sets he has partially completed
                            for (let i = 0; i < Object.keys(b).length; i++) {
                                if (botSets[Object.keys(b)[i]] && botSets[Object.keys(b)[i]].length >= 5 - b[Object.keys(b)[i]].length) {
                                    hisMaxSets += 5 - b[Object.keys(b)[i]].length;
                                }
                            }
                            // Loop for sets he has never crafted
                            for (let i = 0; i < Object.keys(botSets).length; i++) {
                                if (Object.keys(b).indexOf(Object.keys(botSets)[i]) < 0) {
                                    if (botSets[Object.keys(botSets)[i]].length >= 5) {
                                        hisMaxSets += 5;
                                    } else {
                                        hisMaxSets += botSets[Object.keys(botSets)[i]].length;
                                    }
                                }
                                botNSets += botSets[Object.keys(botSets)[i]].length;
                            }
                            client.chatMessage(SENDER, "There are currently " + hisMaxSets + "/" + botNSets + " sets available which " + n + " has not fully crafted yet. Buying all of them will cost " + parseInt(hisMaxSets / CONFIG.CARDS.BUY1KEYFORAMOUNTOFSETS * 100) / 100 + " keys.");
                        } else {
                            client.chatMessage(SENDER, "An error occurred while getting " + n + "'s badges. Please try again.");
                            console.log("An error occurred while getting badges: " + ERR);
                        }
                    });
                } else {
                    client.chatMessage(SENDER, "Please try again later.");
                }
            } else {
                client.chatMessage(SENDER, "Please provide a valid SteamID64.");
            }
        } else if (MSG.toUpperCase() == "!KEYS") {
            manager.getInventoryContents(CONFIG.KEYSFROMGAME, 2, true, (ERR, INV, CURR) => {
                if (ERR) {
                    client.chatMessage(SENDER, "An error occurred while loading the bot's inventory.");
                    console.log("## An error occurred while getting inventory: " + ERR);
                } else {
                    let t = manager.createOffer(SENDER);
                    for (let i = 0; i < INV.length; i++) {
                        if (CONFIG.ACCEPTEDKEYS.indexOf(INV[i].market_hash_name) >= 0) {
                            t.addMyItem(INV[i]);
                        }
                        t.send();
                    }
                }
            });
        } else {
            client.chatMessage(SENDER, "Command not recognized.");;
        }
    } else {
        client.chatMessage(SENDER, "Command not recognized. Use !help to see how this bot works.");
    }
});

client.on("friendRelationship", (SENDER, REL) => {
    if (REL === 2) {
        client.addFriend(SENDER);
    } else if (REL === 3) {
        if (CONFIG.INVITETOGROUPID) {
            client.inviteToGroup(SENDER, CONFIG.INVITETOGROUPID);
        }
        client.chatMessage(SENDER, CONFIG.MESSAGES.WELCOME);
    }
});

// manager.on("unknownOfferSent", (o, os) => {
//     if (o.state == 9) {
//         console.log("## OFFER SENT LIST");
//         community.checkConfirmations();
//     }
// });

// community.on("newConfirmation", (CONF) => {
//     console.log("## New confirmation.");
//     community.acceptConfirmationForObject(CONFIG.IDENTITYSECRET, CONF.id);
// });

manager.on("sentOfferChanged", (OFFER, OLDSTATE) => {
    if(OFFER.state == 2) {
        client.chatMessage(OFFER.partner, "Trade confirmed! Click here to accept it: https://www.steamcommunity.com/tradeoffer/" + OFFER.id);
    } else if (OFFER.state == 3) {
        Utils.getInventory(client.steamID.getSteamID64(), community, (ERR, DATA) => {
            if (!ERR) {
                let s = DATA;
                Utils.getSets(s, allCards, (ERR, DATA) => {
                    if (!ERR) {
                        botSets = DATA;
                        console.log("## Bot's sets loaded.");
                    } else {
                        console.log("## An error occurred while getting bot sets: " + ERR);
                    }
                    let botNSets = 0;
                    for (let i = 0; i < Object.keys(botSets).length; i++) {
                        botNSets += botSets[Object.keys(botSets)[i]].length;
                    }
                    totalBotSets = botNSets;
                    let playThis = CONFIG.PLAYGAMES;
                    if (CONFIG.PLAYGAMES && typeof(CONFIG.PLAYGAMES[0]) == "string") {
                        playThis[0] = parseString(playThis[0], totalBotSets);
                    }
                    client.gamesPlayed(playThis);
                });
            } else {
                console.log("## An error occurred while getting bot inventory: " + ERR);
            }
        });
        if (CONFIG.INVITETOGROUPID) {
            client.inviteToGroup(OFFER.partner, CONFIG.INVITETOGROUPID);
        }
        let d = "" + OFFER.data("commandused") + "";
        d += "\nSets: " + OFFER.data("amountofsets");
        d += "\nKeys: " + OFFER.data("amountofkeys");
        d += "\nSteamID: " + OFFER.partner.getSteamID64();
        fs.writeFile("./TradesAccepted/" + OFFER.id + "-" + OFFER.partner.getSteamID64() + ".txt", d, (ERR) => {
            if (ERR) {
                console.log("## An error occurred while writing trade file: " + ERR);
            }
        });
        community.getSteamUser(OFFER.partner, (ERR, USER) => {
            if (ERR) {
                console.log("## An error occurred while getting user profile: " + ERR);
                client.chatMessage(USER.steamID, "An error occurred while getting your profile (to comment).");
            } else {
                USER.comment(CONFIG.COMMENTAFTERTRADE, (ERR) => {
                    if (ERR) {
                        console.log("## An error occurred while commenting on user profile: " + ERR);
                        client.chatMessage(USER.steamID, "An error occurred while getting commenting on your profile.");
                    } else {
                        client.chatMessage(USER.steamID, "Thanks for trading! :D");
                    }
                });
            }
        });
    } else if (OFFER.state == 6) {
        client.chatMessage(OFFER.partner, "Hey, you did not accept the offer. Please try again if you wish to receive sets!");
    }
    /* else if (OFFER.state == 9) {
            community.checkConfirmations();
        }*/
});

manager.on("newOffer", (OFFER) => {
    if (CONFIG.ADMINS.indexOf(OFFER.partner.getSteamID64()) >= 0 || CONFIG.ADMINS.indexOf(parseInt(OFFER.partner.getSteamID64())) >= 0) {
        OFFER.getUserDetails((ERR, ME, THEM) => {
            if (ERR) {
                console.log("## An error occurred while getting trade holds: " + ERR);
                client.chatMessage(OFFER.partner, "An error occurred while getting your trade holds. Please try again");
                OFFER.decline((ERR) => {
                    if (ERR) {
                        console.log("## An error occurred while declining trade: " + ERR);
                    }
                });
            } else if (ME.escrowDays == 0 && THEM.escrowDays == 0) {
                OFFER.accept((ERR) => {
                    if (ERR) {
                        console.log("## An error occurred while declining trade: " + ERR);
                        OFFER.decline((ERR) => {
                            if (ERR) {
                                console.log("## An error occurred while declining trade: " + ERR);
                            }
                        });
                    } else {
                        client.chatMessage(OFFER.partner, "Offer accepted!");
                    }
                });
            } else {
                client.chatMessage(OFFER.partner, "Please make sure you don't have a trade hold!");
                OFFER.decline((ERR) => {
                    if (ERR) {
                        console.log("## An error occurred while declining trade: " + ERR);
                    }
                });
            }
        });
    } else if (OFFER.itemsToGive.length == 0) {
        let onlySteam = true;
        for (let i = 0; i < OFFER.itemsToReceive.length; i++) {
            if (OFFER.itemsToReceive[i].appid != 753) {
                onlySteam = false;
            }
        }
        if (onlySteam) {
            OFFER.accept((ERR) => {
                if (ERR) {
                    console.log("## An error occurred while declining trade: " + ERR);
                }
            });
        }
    } else {
        OFFER.decline((ERR) => {
            if (ERR) {
                console.log("## An error occurred while declining trade: " + ERR);
            }
        });
    }
});

community.on("newConfirmation", (CONF) => {
    console.log("## New confirmation.");
    community.acceptConfirmationForObject(CONFIG.IDENTITYSECRET, CONF.id, (ERR) => {
        if (ERR) {
            console.log("## An error occurred while accepting confirmation: " + ERR);
        } else {
            console.log("## Confirmation accepted.");
        }
    });
});

function sortSetsByAmount(SETS, callback) {
    callback(Object.keys(SETS).sort((k1, k2) => SETS[k1].length - SETS[k2].length).reverse());
}

function sortSetsByAmountB(SETS, callback) {
    callback(Object.keys(SETS).sort((k1, k2) => SETS[k1].length - SETS[k2].length));
}

function parseString(INPUT, SETS) {
    return INPUT.replace(":sets:", SETS);
}
