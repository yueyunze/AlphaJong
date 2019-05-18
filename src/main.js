//################################
// MAIN
//################################

//Bot can be activated/deactivated by pressing Numpad +
if(!isDebug()) {
    window.onkeyup = function(e) {
      var key = e.keyCode ? e.keyCode : e.which;

      if (key == 107 && run) { // Numpad + Key
        log("AlphaJong deactivated!"); 
        run = false;
      }
      else if(key == 107 && !run) {
        log("AlphaJong activated!"); 
        run = true;
		//setInterval(sendHeatBeat, 60000);
        main();
      }
    }
	
	if(AUTORUN) {
		log("Autorun start");
		setInterval(sendHeatBeat, 60000); // 1 min? 5 min?
		setTimeout(startGame, 20000); //Search for new game after 20 seconds
	}
}


//TODO LIST:

//Calls with Options
//More value for pairs (see strategy guides)
//Before Riichi: Check if Furiten
//Delay Riichi for better wait
//More value to first pair? Maybe give value to second pair?
//9 Terminals -> Call Draw
//Multiple Calls
//Start Main Loop instantly, top of loop: check ingame or lobby is loaded
//Calculate Doras/Yaku in dangerlevel
//Look for Flush in Defense
//Change the way how Safety-Value affects the normal discard
//More Yaku
//Use Scores for Calculating Strategy (Going for fast wins as first etc.)
//Other Player Open Hands: How big (yaku/dora) are the hands -> calculate Dangerlevel
//Fold better... before calls?
//Riichi sometimes fails...
//Better Log
//Save some parts of the log (Endresult? Won by Ron etc.) in Local Storage

//Main Loop
function main() {
	if(!run) {
		return;
	}
	if(!isInGame()) {
		log("Game is not running, sleep 2 seconds.");
		errorCounter++;
		if(errorCounter > 60) { //2 minutes no game found -> reload page
			goToLobby();
		}
		setTimeout(main, 2000); //Check every 3 seconds if ingame
		return;
	}
	
	if(isDisconnect()) {
		goToLobby();
	}
	
	var operations = getOperationList(); //Get possible Operations
	
	if(operations == null || operations.length == 0) {
		errorCounter++;
		if(errorCounter > 60) { //2 minutes not own turn: Reload Page TODO:: Might restart when in Riichi
			goToLobby();
		}
		checkForEnd();
		log("Waiting for own turn, sleep 2 seconds.");
		setTimeout(main, 2000);
		return;
	}
	errorCounter = 0;
	
	log("");
	log("##### OWN TURN #####");
	log("Current Danger Level: " + getCurrentDangerLevel());
	
	setData(); //Get current state of the board
	
	determineStrategy(); //Get the Strategy for the current situation. After calls so it does not reset folds
	
	for(var i = 0; i < operations.length; i++) { //Priority Operations: Should be done before discard on own turn
		switch(operations[i].type) {
		case getOperations().an_gang: // From Hand
			callAnkan();
			break;
		case getOperations().add_gang: //Add from Hand to Pon
			callShouminkan();
			break;
		case getOperations().zimo:
			callTsumo();
			break;
		case getOperations().rong:
			callRon();
			break;
		}
	}

	for(var i = 0; i < operations.length; i++) {
		switch(operations[i].type) {
		case getOperations().dapai:
			discard();
			break;
		case getOperations().eat:
			callTriple(operations[i].combination, getOperations().eat); 
			break;
		case getOperations().peng:
			callTriple(operations[i].combination, getOperations().peng);
			break;
		case getOperations().ming_gang: //From others
			callDaiminkan();
			break;
		}
	}
	log(" ");
	setTimeout(main, 2000);
}

//Set Data from real Game
function setData() {
	
	dora = getDora();
	
	ownHand = [];
	for(var i = 0; i < getPlayerHand().length; i++) { //Get own Hand
		ownHand.push(getPlayerHand()[i].val);
	}
	
	discards = [];
	for(var j = 0; j < 4; j++) { //Get Discards for all Players
		var temp_discards = [];
		for(var i = 0; i < getDiscardsOfPlayer(j).pais.length; i++) {
			temp_discards.push(getDiscardsOfPlayer(j).pais[i].val);
		}
		if(getDiscardsOfPlayer(j).last_pai != null) {
			temp_discards.push(getDiscardsOfPlayer(j).last_pai.val);
		}
		discards.push(temp_discards);
	}
	
	calls = [];
	for(var j = 0; j < 4; j++) { //Get Calls for all Players
		var temp_calls = [];
		for(var i = 0; i < getCallsOfPlayer(j).length; i++) {
			temp_calls.push(getCallsOfPlayer(j)[i].val);
		}
		calls.push(temp_calls);
	}
	
	if(tilesLeft < getTilesLeft()) { //Check if new round
		isClosed = true;
		setAutoCallWin(true);
		strategy = STRATEGIES.GENERAL;
		strategyAllowsCalls = true;
	}
	
	if(calls[0].length > 0) {
		isClosed = false;
	}
	tilesLeft = getTilesLeft();
	
	if(!isDebug()) {
		seatWind = getSeatWind(0); //TODO: FIX 
		roundWind = getRoundWind();
	}
	
	updateAvailableTiles();
}

//Search for Game and start Main Loop
function startGame() {
	if(!isInGame()) {
		log("Searching for Match in Room " + ROOM);
		app.NetAgent.sendReq2Lobby('Lobby', 'matchGame', {match_mode: ROOM});
	}
	log("Main Loop started.");
	run = true;
	main();
}

//Check if End Screen is shown
function checkForEnd() {
	if(isEndscreenShown() && AUTORUN) {
		run = false;
		log(JSON.stringify(view.DesktopMgr.Inst.gameEndResult));
		setTimeout(goToLobby, 25000);
	}
}

//Reload Page to get back to lobby
function goToLobby() {
	location.reload(1);
}

//Prevent AFK warning, gets called every minute
//TODO: Does not work. Move Mouse?
function sendHeatBeat() {
	log("Sending Heatbeat");
	app.NetAgent.sendReq2Lobby('Lobby', 'heatbeat', {no_operation_counter: 0});
	//this.GameMgr.Inst._pre_mouse_point...
}