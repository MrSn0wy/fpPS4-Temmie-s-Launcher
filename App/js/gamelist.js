/*
	******************************************************************************
	fpPS4 Temmie's Launcher
	gamelist.js

	This file contains all functions / variables related to creating and managing 
	gamelist
	******************************************************************************
*/

temp_GAMELIST = {
	
	// Game List
	list: {},

	// Selected game
	selectedGame: '',

	// Selected game settings
	cGameSettings: {},

	// Make game settings
	createGameSettings: function(data){

		// Temp JSON
		var logMessage = '',
			gameSettings = {
				name: data.name,
				hacks: data.hacks,
				paramSfo: data.paramSfo,
				importedModules: data.importedModules
			}

		// Write file
		try {

			APP.fs.writeFileSync(data.path, JSON.stringify(gameSettings), 'utf-8');
			logMessage = 'INFO - Settings file was created successfully for ' + data.name + '!\nPath: ' + data.path;
		
		} catch (err) {

			console.error(err);
			logMessage = 'ERROR - Unable to create settings file for ' + data.name + ' at ' + data.path + '!\nReason: ' + err;

		}

		// Log result
		APP.log(logMessage);

	},

	// Save game settings
	saveGameSettings: function(bypassCheck){

		// Path
		var fLog = '',
			cHacks = {},
			fPath = APP.path.parse(this.list[this.selectedGame].exe).dir + '/launcherSettings.json';

		// Update hack data
		APP.design.hackList.forEach(function(hName){
			cHacks[hName] = JSON.parse(document.getElementById('CHECK_' + hName).checked);
		});

		// Check if needs to update hack files
		if (JSON.stringify(cHacks) !== JSON.stringify(APP.gameList.cGameSettings.hacks) || bypassCheck === !0){

			// Update variable
			APP.gameList.cGameSettings.hacks = cHacks;

			// Write file
			try {

				APP.fs.writeFileSync(fPath, JSON.stringify(APP.gameList.cGameSettings), 'utf-8');
				fLog = 'INFO - (' + APP.gameList.selectedGame + ') Settings file was updated successfully!';

			} catch (err) {

				console.error(err);
				fLog = 'ERROR - Unable to update settings file for ' + APP.gameList.selectedGame + ' at ' + fPath + '!\nReason: ' + err;

			}

		} else {

			// Skip updating settings
			fLog = 'INFO - (' + APP.gameList.selectedGame + ') Skip updating settings file since it had no changes!';			

		}

		// Fix space between launcher logs and main emu logs
		APP.log(fLog + '\n ');

	},

	// Load list
	load: function(){

		// Check if path exists
		if (APP.fs.existsSync(APP.settings.data.gamePath) === !0){

			// Reset search box
			document.getElementById('INPUT_gameListSearch').value = '';

			// Reset game list
			APP.gameList.list = {};
			
			// Get game list
			const gList = APP.fs.readdirSync(APP.settings.data.gamePath);

			if (gList.length > 0){

				// Process game list
				gList.forEach(function(gPath){
		
					var appBg,
						appIcon,
						addGame = !0,
						paramSfo = {},
						appId = gPath,
						appName = gPath,
						paramSfoAvailable = !1,
						iconList = [
							'icon.png',
							'icon0.png',
							'icon1.png',
							'sce_sys/icon.png',
							'sce_sys/icon0.png',
							'sce_sys/icon1.png'
						],
						backgroundList = [
							'pic0.png',
							'pic1.png',
							'sce_sys/pic0.png',
							'sce_sys/pic1.png'
						],
						pathBase = APP.settings.data.gamePath + '/' + gPath + '/',
						paramSfoPath = pathBase + 'sce_sys/param.sfo',
						executableName = pathBase + 'eboot.bin';
		
					// If eboot.bin doesn't exists, look for any .elf file
					if (APP.fs.existsSync(executableName) !== !0){

						// Seek .elf files on root dir
						var fList = APP.fs.readdirSync(pathBase),
							execName = fList.filter(function(fName){
								if (fName.toLowerCase().indexOf('.elf') !== -1){
									return fName;
								}
							})[0];

						// Set executable name - if not found (undefined), skip entry!
						executableName = pathBase + execName;
						if (execName === void 0){
							addGame = !1;
						}

					}

					// Seek App Icon
					for (var i = 0; i < iconList.length; i++){
						if (APP.fs.existsSync(pathBase + iconList[i]) === !0){
							appIcon = pathBase + iconList[i];
							break;
						}
					}
					
					// Seek App Background
					for (var i = 0; i < backgroundList.length; i++){
						if (APP.fs.existsSync(pathBase + backgroundList[i]) === !0){
							appBg = pathBase + backgroundList[i];
							break;
						}
					}

					// Check if Icon and Background exists - if not, use 404
					if (APP.fs.existsSync(appIcon) === !1){
						appIcon = APP.settings.data.nwPath + '/app/img/404.png'; 
					}
					if (APP.fs.existsSync(appBg) === !1){
						appBg = APP.settings.data.nwPath + '/app/img/404_BG.png';
					}
		
					// Check if PARAM.SFO is present
					if (APP.settings.data.enableParamSfo === !0 && APP.fs.existsSync(paramSfoPath) === !0){
						
						// Set PARAM.SFO variables
						paramSfoAvailable = !0;
						paramSfo = APP.paramSfo.parse(paramSfoPath);

						// Set game entry
						appName = paramSfo.TITLE;
						appId = paramSfo.TITLE_ID;

					}

					// If executable exists, set data
					if (addGame === !0){

						// Add game to list
						APP.gameList.list[appId] = {
							bg: appBg,
							name: appName,
							icon: appIcon,
							folderName: gPath,
							paramSfo: paramSfo,
							exe: executableName,
							paramSfoAvailable: paramSfoAvailable
						}

					}
		
				});

			} else {

				// No games / homebrew found
				APP.log('INFO - No games / homebrew were detected on current path (' + APP.settings.data.gamePath + ')');

			}

			// Render game list
			APP.design.renderGameList();

		}

	},

	// Process Search List
	search: function(){

		var gameListArray = Object.keys(APP.gameList.list),
			searchQuery = document.getElementById('INPUT_gameListSearch').value;

		// If search query isn't empty and user has more than one game, process search
		if (searchQuery !== '' && gameListArray.length > 1){

			if (APP.gameList.selectedGame !== ''){
				APP.gameList.selectedGame = '';
				APP.design.update();
			}

			// Process search query
			var tempList, listRender = {};
			
			// Case game search mode is TITLE_ID
			if (APP.settings.data.gui.gameSearchMode === 'titleId'){

				tempList = gameListArray.filter(function(cItem){ 
					if(cItem.indexOf(searchQuery) !== -1){
						return cItem;
					}
				});

			}

			// If game search mode is APP_NAME
			if (APP.settings.data.gui.gameSearchMode === 'appName'){

				tempList = [];

				gameListArray.forEach(function(cTitle){

					if (APP.gameList.list[cTitle].name.indexOf(searchQuery) !== -1){
						tempList.push(cTitle);
					}

				});

			}

			// Generate a new list
			tempList.forEach(function(cItem){
				listRender[cItem] = APP.gameList.list[cItem];
			});

			// Render new list
			if (Object.keys(listRender).length !== 0){
				APP.design.renderGameList(listRender);
			} else {
				document.getElementById('DIV_LIST_INTERNAL').innerHTML = '<div class="DIV_noGameFound">Unable to find \"' + searchQuery + '\" :(</div>';
			}

		} else {

			// Render normal game list
			APP.gameList.load();
		
		}

	},

	// Open selected game location
	openGameLocation: function(){

		if (this.selectedGame !== ''){
			APP.fileManager.openDir(APP.settings.data.gamePath + '/' + this.list[this.selectedGame].folderName);
		}

	},

	// Export game metadata
	exportGameMetadata: function(){

		if (this.selectedGame !== '' && this.list[this.selectedGame].paramSfoAvailable === !0){

			APP.fileManager.saveFile(this.selectedGame + '_metadata', '.json', 'utf-8', JSON.stringify(this.list[this.selectedGame].paramSfo), function(cPath){
				window.alert('INFO - Save successfull!\nPath: ' + cPath);
				APP.log('INFO - Save successfull!\nPath: ' + cPath);
			});

		}

	},

	// Reset current game settings
	resetGameSettings: function(){

		const cGame = this.selectedGame,
			fName = APP.settings.data.gamePath + '/' + this.list[cGame].folderName + '/launcherSettings.json',
			conf = window.confirm('WARN - This will delete all saved settings this title:\n' + this.list[cGame].name + '\n\nDo you want to continue?');

		if (this.selectedGame !== '' && APP.fs.existsSync(fName) === !0 && conf === !0){

			// Remove file
			try {

				// Remove settings file
				APP.fs.unlinkSync(fName);

				// Reload data
				setTimeout(function(){
					APP.gameList.selectedGame = '';
					APP.gameList.load();
					APP.design.selectGame(cGame);
					TMS.scrollCenter('GAME_ENTRY_' + cGame);
				}, 50);

			} catch (err) {

				console.error(err);
				APP.log('ERROR - Unable to remove settings file!\nReason: ' + err);

			}

		}

	},

	// Removed Imported modules
	removeImportedModules: function(){

		if (this.selectedGame !== '' && this.cGameSettings.importedModules.length > 0){

			const gName = this.selectedGame,
				mList = this.cGameSettings.importedModules,
				conf = window.confirm('WARN - This action will remove all previous modules imported from this title. They are:\n\n' +
										mList.toString().replace(RegExp(',', 'gi'), '\n') + '\n\nDo you want to continue?');

			if (conf === !0){

				// Base dir
				var cMessage = '',
					mDir = APP.settings.data.gamePath + '/' + APP.gameList.list[gName].folderName + '/sce_module/';

				// Try removing modules
				mList.forEach(function(mName){

					try {
						
						APP.fs.unlinkSync(mDir + mName);
						mList.splice(mList.indexOf(mName), 1);
						cMessage = 'INFO - (' + gName + ') Removing module: ' + mName

					} catch (err) {
						
						console.error(err);
						cMessage = 'ERROR - Unable to remove modules!\nReason: ' + err;
						
					}

					// Log status
					APP.log(cMessage);

				});

				// Update settings file
				this.saveGameSettings(!0);

				// End
				window.alert('INFO - Process complete!\nCheck log for more details.');
				APP.design.selectGame(this.selectedGame);

			}

		}

	}

}