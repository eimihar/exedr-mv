//==============================================
// Exedr-mv RPG Maker MV Engine
// by Remi @ Eimihar @ Ahmad Rahimie
// http://github.com/eimihar/exedr-mv
// The core js script written for RPG Maker MV game development
// status : in-complete
//==============================================
var Exedr = Exedr || {};

var testdata = function()
{
	return console.log('testdata');
};

Exedr.create = function()
{
	return {data : {}};
}

/**
* @param {array} data
* @param {closure} onClear
**/
Exedr.data = function(data, onClear)
{
	if(onClear)
		data.onClear = onClear;

	data.clear = function()
	{
		data.onClear();
	}

	return data;
}

//=================================
// Exedr.registry
// - A general listener
// @param Exedr object
//=================================
Exedr.listener = function(exedr)
{
	this.data = {};

	this.on = function(name, callback)
	{
		this.data[name] = callback;
	}

	this.run = function(name)
	{
		if(this.data[name])
			this.data[name](exedr);
	}
};

//===================================
// Exedr.loader
//==================================
Exedr.loader = function($exe)
{
	this.loadEvents = function(variable, mapId)
	{
		if(!$exe.data[variable])
			$exe.data[variable] = {};

		DataManager.loadMapData(mapId, function(dataMap)
		{
			dataMap.events.forEach(function(ev)
			{
				if(ev)
					$exe.data[variable][ev.id] = ev;
			});
		});
	}
}

//=================================
// Exedr.daytime
// - handle daytime information
//=================================
/**
Tone candidates :
- PRESUNSET
	0, -100, -150, 75

- Sunset :
	0, -100, -200, -100
	-75, -100, 0, 75
**/
Exedr.daytime = function(gameScreen, clock)
{
	this.data = {
		DAWN : ['4:00', [-150, -100, 0, 125]],
		PRESUNRISE : ['6:00', [-75, -75, 25, 125]],
		SUNRISE : ['7:00', [-20, -20, 0, 50]],
		MORNING : ['7:00', [10, 10, 0, -20]],
		NOONSTART : ['11:30', [45, 45, 0, -25]],
		NOONEND : ['15:00', [0, 0, 0, 0]],
		PRESUNSET : ['17:00', [0, -50, -100, 0]],
		SUNSET : ['18:00', [0, -100, -100, 75]],
		NIGHT : ['20:00', [-150, -100, 0, 125]],
		MIDNIGHT : ['00:00', [-125, -125, 0, 125]],
		DEEPMIDNIGHT : ['01:00', [-175, -175, 0, 125]]
	};

	this.callbacks = {};

	this.temporary = false;

	this.pause = function()
	{
		this.paused = true;
	}

	this.unpause = function()
	{
		this.paused = false;
	}

	this.set = function(preset, duration, temporary)
	{
		// if preset is current, unpause anything, and set preset to the last preset.
		if(preset == 'CURRENT')
		{
			this.unpause();
			preset = this.current;
		}

		// daytime is currently set to temporary preset
		if(this.paused)
		{
			this.current = preset;
			return;
		}

		if(temporary)
			this.pause();

		if(!temporary && preset != 'CURRENT')
		{
			this.temporary = false;
			this.current = preset;
		}


		// tint
		var duration = duration || 60;
		gameScreen.startTint(this.data[preset][1], duration);

		// execute callbacks
		if(this.callbacks[preset])
		{
			for(var key in this.callbacks[preset])
			{
				this.callbacks[preset][key]();
			}
		}
	}

	this.isBetween = function(first, second)
	{
		var first = this.data[first][0];
		var second = this.data[second][0];

		return Exedr.util.timeIsBetween(first, second, clock.current());
	}

	this.is = function(preset)
	{
		return this.current == preset;
	}

	this.initiate = function()
	{
		for(var preset in this.data)
		{
			var data = $exe.daytime.data[preset];
			var time = Exedr.util.parseTime(data[0]);

			// console.log(parseInt(time[0])+':'+parseInt(time[1]));
			(function(preset)
			{
				$exe.event.setDaily(time.hour, time.minute, function()
				{
					// console.log(preset);
					$exe.daytime.set(preset);
				});
			})(preset);
		}
	}

	/**
	* Get time for the given preset
	* @return array [h, m] 
	**/
	this.getTime = function(preset)
	{
		var data = this.data[preset][0].split(':');

		return [parseInt(data[0]), parseInt(data[1])];
	}

	/**
	* Register callback on the given preset
	* @param {string} preset
	* @param {closure} callbacks
	* @return Exedr.storage
	**/
	this.on = function(preset, callbacks)
	{
		var key = Math.random()+'';

		var context = this;

		if(!this.callbacks[preset])
			this.callbacks[preset] = {};

		return this.callbacks[preset][key] = Exedr.data(callbacks, function()
		{
			delete context.callbacks[preset][key];
		});
	}
}

//============================
// Exedr.encounter
// - an encounter manager
//============================
Exedr.encounter = function()
{
	this.create = function(troopId)
	{

	}
}

//=============================
// Exedr.time 
// - A Time Engine
//=============================
Exedr.time = function()
{
	var framely = {};

	this._seconds = 0;
	this._frames = 0;
	this._multiplier = 0;
	this._increment = 0;

	this.minutes = function()
	{
		return this._seconds;
	}

	this.hours = function()
	{
		return Math.floor(this.minutes() / 60);
	}

	/**
	* Set speed by multiplier
	* @param float multiplier
	**/
	this.setSpeed = function(multiplier)
	{
		this._multiplier = multiplier;
		this._increment = Math.ceil(multiplier / 60);
	}

	this.update = function(callback)
	{
		for(var key in framely)
		{
			var result = framely[key]();

			if(result === false)
				delete framely[key];
		}

		this._frames += 1 * this._multiplier;
		
		// console.log(this._frames % 60);
		if(this._frames >= 60)
		{
			this._seconds += this._increment;

			if(callback)
				callback(this._seconds);
			
			this.minutelyUpdate();

			this._frames = 0;
		}
	}

	this.minutelyUpdate = function()
	{
		this.event.update();
	}

	this.onEveryFrame = function(callback)
	{
		framely[Math.random()+''] = callback;
	}

	this.setSpeed(1);

	//=======================
	// Exedr.time.clock
	// - The game clock
	//=======================
	this.clock = new function(time)
	{
		var time = time;

		this.time = function()
		{
			return time;
		}

		this.minute = function()
		{
			return time.minutes() % 60;
		}

		this.hour = function()
		{
			return Math.floor(time.minutes() / 60) % 24;
		}

		this.day = function()
		{
			return Math.floor(time.minutes() / 60 / 24) % 7;
		}

		this.current = function()
		{
			return Exedr.util.stringifyTime(this.hour(), this.minute());
		}

		/**
		* @param {string} first
		* @param {string} second
		**/
		this.isBetween = function(first, second)
		{
			return Exedr.util.timeIsBetween(first, second, this.current());
		}

		this.createText = function()
		{
			var hour = this.hour();
			var amPm = hour >=  12 ? 'PM' : 'AM';
				hour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
			var minute = this.minute();
			// var text = Exedr.util.repeatFills(hour, 2)+':'+Exedr.util.repeatFills(minute, 2)+' '+amPm;
			var text = Exedr.util.stringifyTime(hour, minute)+' '+amPm

			return text;
		}
	}(this);

	//===================
	// Exedr.time.event
	// - The game time-based eventing engine
	//===================
	this.event = new function(clock)
	{
		var daily = {};
		var clock = clock;
		this.clock = clock;
		var interval = {};
		var minutely = {};
		var storage = {};

		var calculateMinutes = function(startHour, startMinute, endHour, endMinute)
		{
			var hour = endHour - startHour;
			var minute = endMinute - startMinute;

			var minutes = (hour * 60) + minute;

			return minutes < 0 ? 1440 + minutes : minutes;
		}

		var intervalInstance = function(option, event)
		{
			var event = event;
			var callback = option.callback;
			var minutes = option.minute;
			var repeat = option.repeat != null ? option.repeat : true;
			var origin = option.origin != null ? option.origin : minutes;
			var key = Math.random()+'';
			var minute = null;
			var old;

			// not used
			/*this.flush = function()
			{
				if(old)
					delete event.getStorage()[old][key];
			}

			// not used
			this.clear = function()
			{
				console.log(event.getStorage()[minute][key]);
				delete event.getStorage()[minute][key];
			}*/

			this.start = function(minutes)
			{
				minute = event.clock.time().minutes() + minutes;

				var storage = event.getStorage();

				if(!storage[minute])
					storage[minute] = {};

				storage[minute][key] = this;

				return minute;
			}

			this.begin = function()
			{
				old = minute;
				return this.start(minutes);
			}

			this.restart = function()
			{
				old = minute;
				return this.start(origin);
			}

			this.getKey = function()
			{
				return key;
			}

			this.isRepeatable = function()
			{
				return repeat === true;
			}

			this.execute = function()
			{
				return callback();
			}

			this.update = function()
			{
				this.execute();

				if(this.isRepeatable())
					this.restart();
				else
					delete this;
			}
		}

		this.getStorage = function()
		{
			return storage;
		}

		this.setDaily = function(hour, minute, callback, repeat)
		{
			// var key = key+clock.time().minutes();
			var repeat = repeat != null ? repeat : true;

			var minutes = calculateMinutes(clock.hour(), clock.minute(), hour, minute);

			var intervalInst = new intervalInstance({
				minute : minutes, 
				origin : 1440, 
				callback : callback, 
				repeat : repeat
			}, this);

			intervalInst.begin();

			return intervalInst;
		}

		this.setTimeout = function(minute, callback)
		{
			return this.setInterval(minute, callback, false);
		}

		this.setInterval = function(minute, callback, repeat)
		{
			var intervalInst = new intervalInstance({
				callback: callback, 
				minute: minute, 
				repeat: repeat
			}, this);

			intervalInst.begin();

			return intervalInst;
		}

		/**
		* Non saved interval
		**/
		this.onEvery = function(minute, callback, save)
		{
			if(save)
				return this.setInterval(minute, callback, true);

			if(minute == 1)
				return this.setMinutelyInterval(callback);

			interval[Math.random()] = {
				minute : minute,
				counter : minute,
				callback : callback
			};
		}

		this.onEveryMinute = function(callback)
		{
			return this.setMinutelyInterval(callback);
		}

		this.setMinutelyInterval = function(callback)
		{
			minutely[Math.random()] = callback;
		}

		/**
		* Minutely run this update, forever
		**/
		this.update = function()
		{
			var minutes = clock.time().minutes();

			for(var key in minutely)
			{
				var result = minutely[key]();

				if(minutely[key] === false)
					delete minutely[key];
			}

			for(var key in interval)
			{
				if(interval[key].counter > 0)
				{
					interval[key].counter--;
					continue;
				}

				interval[key].counter = interval[key].minute;
				interval[key].callback();
			}

			if(storage[minutes])
			{
				for(var key in storage[minutes])
				{
					var intervalInst = storage[minutes][key];
					intervalInst.update();
				}
			}
		}

	}(this.clock);
}

//=================================
// Exedr.weather
// - A weather management engine
//=================================
Exedr.weather = function($gameScreen)
{
	this.current = null;

	this.start = function(type, power, duration)
	{
		this.current = [type, power, duration];

		$gameScreen.changeWeather(type, power, duration);
	}

	this.setInside = function()
	{
		this.stop(true);
	}

	// instantly continue weather.
	this.continue = function()
	{
		if(!this.current)
			return;

		$gameScreen.changeWeather(this.current[0], this.current[1], this.current[2]);
	}

	this.stop = function(instant)
	{
		if(instant)
		{
			$gameScreen.clearWeather();
		}
		else
		{
			this.current = null;
			$gameScreen.changeWeather('none', 0, 60);
		}
	}

	this.isRunning = function()
	{
		return this.current !== null;
	}

	/**
	* To be hooked internally.
	**/
	this.update = function()
	{
		if($gameScreen._weatherDuration > 0)
		{
			var d = $gameScreen._weatherDuration;
			var t = $gameScreen._weatherPowerTarget;

			$gameScreen._weatherPower = ($gameScreen._weatherPower * (d - 1) + t) / d;
			$gameScreen._weatherDuration--;

			if($gameScreen._weatherPower == 0 && $gameScreen._weatherDuration == 0)
				$gameScreen._weatherType = 9;
		}
	}
};

//=================================
// Exedr.Util
// - Utility class
//=================================
Exedr.util = new function()
{
	this.repeatFills = function(text, length, char)
	{
		var char = char || '0';
		var totalZeros = length - (''+text).length;
		var zeros = '';

		if(totalZeros == 0)
			return text;

		for(var i = 0;i < totalZeros;i++)
			zeros += char;

		return zeros+text;
	}

	/**
	* @param {string} time
	* @return {hour: int, minute: int}
	**/
	this.parseTime = function(time)
	{
		var time = time.split(':');

		return {hour: parseInt(time[0]), minute: parseInt(time[1])};
	}

	this.stringifyTime = function(hour, minute)
	{
		var time = Exedr.util.repeatFills(hour, 2)+':'+Exedr.util.repeatFills(minute, 2);

		return time;
	}

	/**
	* @param {string} first
	* @param {second} second
	* @param {current} string
	**/
	this.timeIsBetween = function(first, second, current)
	{
		var first = this.parseTime(first);
			first = first.hour * 60 + first.minute;
		var second = this.parseTime(second);
			second = second.hour * 60 + second.minute;

		if(second < first)
			second += 1440;

		var current = this.parseTime(current);
			current = current.hour * 60 + current.minute;

		if(current < first)
			current += 1440;

		return first <= current && second >= current;
	}
};

Exedr.protoCopy = function(cls, methods)
{
	var copy = {};
	for(var i in methods)
		copy[methods[i]] = cls.prototype[methods[i]];

	return copy;
};

//===============================================
// @Extends Scene_Boot
// - loadSystemImages
//===============================================
(function(parent)
{
	Scene_Boot.prototype.loadSystemImages = function()
	{
		parent.loadSystemImages.call(this);
		ImageManager.loadSystem('Windowless');
	}
})(Exedr.protoCopy(Scene_Boot, ['loadSystemImages']));


Window_Message.prototype.loadWindowskin = function()
{
	this.windowskin = ImageManager.loadSystem('Windowless');
}

//===============================================
// Class Window_Time
//===============================================
function Window_Time()
{
	this.initialize.apply(this, arguments);
}

Window_Time.prototype = Object.create(Window_Base.prototype);
Window_Time.prototype.constructor = Window_Time;

Window_Time.prototype.initialize = function(time)
{
	Window_Base.prototype.initialize.call(this, Graphics.boxWidth - 140, 0, 140, this.fittingHeight(1));
	this.backOpacity = 0;
	this.windowskin = ImageManager.loadSystem('Windowless');
	this.time = time;
	this.refresh();
};

Window_Time.prototype.open = function() {
    this.refresh();
    Window_Base.prototype.open.call(this);
};

Window_Time.prototype.refreshTime = function()
{
	this.contents.clear();
	var text = this.time.clock.createText();
	this.contents.drawText(text, 0, 10, 100, 10, 'right');
};

Window_Time.prototype.refresh = function()
{
	this.refreshTime();
};

Window_Time.prototype.update = function()
{
	var context = this;

	// refresh content every seconds.
	this.time.update(function()
	{
		context.refresh();
	});
};

//==================================================
// @Game_Followers
//==================================================
Game_Followers.prototype.pos = function(x, y)
{
	var bool = false;
	this.forEach(function(follower)
	{
		if(follower.actor())
			if(follower.pos(x, y))
				bool = true;
	});

	return bool;
};

//==================================================
// Game_TroopEvents
// - Collection of Game_TroopEvent
//==================================================
function Game_TroopEvents()
{
	this.initialize.apply(this, arguments);
}

Game_TroopEvents.prototype.constructor = Game_TroopEvents;

Game_TroopEvents.prototype.add = function(troopEvent)
{
	this.data[troopEvent.troopEventId()] = troopEvent;
}

Game_TroopEvents.prototype.remove = function(troopEvent)
{

}

//==================================================
// Class Game_TroopEvent
//==================================================
function Game_TroopEvent()
{
	this.initialize.apply(this, arguments);
};

Game_TroopEvent.prototype = Object.create(Game_Event.prototype);
Game_TroopEvent.prototype.constructor = Game_TroopEvent;

/**
* Additional parameter : referenceLocalId
* @param {int} mapId
* @param {int} eventId
* @param {int} troopEventId
*/
Game_TroopEvent.prototype.initialize = function(mapId, eventId, troopEventId, troopId)
{
	Game_Character.prototype.initialize.call(this);
	this._mapId = mapId;
	this._eventId = eventId;
	this._troopEventId = troopEventId;
	this._troopId = troopId;
	this.refresh();
};

Game_TroopEvent.prototype.troopEventId = function()
{
	return this._troopEventId;
}

Game_TroopEvent.prototype.appearAt = function(x, y)
{
	this.setOpacity(0);
	this.locate(x, y);

	var frame = 0;
	var context = this;
	var opacityPerFrame = 255 / 120;
	$exe.time.onEveryFrame(function()
	{
		context.setOpacity(opacityPerFrame * frame);
		
		if(frame >= 60)
			return false;

		frame++;
	});
}

Game_TroopEvent.prototype.checkEventTriggerTouch = function(x, y)
{
	if(!$gameMap.isEventRunning())
		if(this._trigger === 2 && ($gamePlayer.pos(x, y) || $gamePlayer._followers.pos(x, y)))
			if (!this.isJumping() && this.isNormalPriority())
				this.start();
}

/**
* This Class will use the referenced eventId (_referenceLocalId)
*/
Game_TroopEvent.prototype.event = function()
{
	return $exe.data.troopEvents[this._troopEventId];
};

Game_TroopEvent.prototype.start = function()
{
	this._starting = true;

	BattleManager.setup(this._troopId, true, false);
	BattleManager.onEncounter();

	$gamePlayer.beginEncounter();

	this.erase();
};

//===============================================
// @Game_Map
// - &setup
// - createTroopEvent
// - createRandomTroop
// - createRandomEncounter
// - getTotalEncounter
// - getRandomEncounter
//===============================================
(function(parent)
{
	Game_Map.prototype.setup = function()
	{
		parent.setup.apply(this, arguments);
		$exe.listener.run('gameMapSetup');
	}
})(Exedr.protoCopy(Game_Map, ['setup']));

Game_Map.prototype.createTroopEvent = function(troopId, x, y)
{
	// base the new id to the length of the current dataMap.events
	var troopEventId = $exe.data.troopEventMap[troopId];
	var eventId = this._events.length;
	var troopEvent = this._events[eventId] = new Game_TroopEvent(this._mapId, eventId, troopEventId, troopId);

	SceneManager._scene.pushCharacterSprite(troopEvent);

	if(x && y)
		troopEvent.locate(x, y);

	return troopEvent;
};

Game_Map.prototype.createRandomTroop = function()
{
	var troop = this.createTroopEvent(this.getRandomEncounter().troopId);

	return troop;
};

Game_Map.prototype.createRandomEncounter = function()
{
	var troop = this.createRandomTroop();
	var loc = $gamePlayer.getRandomLocation();

	troop.appearAt(loc[0], loc[1]);
}

Game_Map.prototype.getTotalEncounter = function()
{
	return $dataMap.currentEncounter.length;
}

/**
* Get random encounter from list of encounters registered in the current map.
* @return encounter
*/
Game_Map.prototype.getRandomEncounter = function()
{
	var encounterList = $dataMap.encounterList;
	var randomInt = Math.randomInt(encounterList.length);

	var i = 0;
	var encounter;
	encounterList.forEach(function(enc)
	{
		if(randomInt == i)
			encounter = enc;

		i++;
	});

	return encounter;
};

//==================================================
// @Game_Player
// - &executeEncounter
// - getRandomLocation
//==================================================
Game_Player.prototype.executeEncounter = function()
{
	if(!$gameMap.isEventRunning() && this._encounterCount <= 0)
	{
		this.makeEncounterCount();

		if($dataMap.encounterList.length > 0)
			$gameMap.createRandomEncounter();
	}

	return false;
};

Game_Player.prototype.moveTo = function(x, y)
{
	if(this.x != x || this.y != y)
	{
		var direction = this.findDirectionTo(x, y);
		this.executeMove(direction);

		this.moveTo(x, y);
	}
}

Game_Player.prototype.beginEncounter = function()
{
	this._isEncountering = true;
}

Game_Player.prototype.isEncountering = function()
{
	var isEncountering = this._isEncountering ? true : false;

	if(isEncountering)
	{
		this._isEncountering = false;
		return true;
	}

	return false;
}

/**
* Get random passable location around the player
* @return [x, y]
**/
Game_Player.prototype.getRandomLocation = function()
{
	// btm, left, right, top
	var directions = [2, 4, 6, 8];
	var opposites = {2:8, 8:2, 4:6, 6:4};
	var increment = {2: 1, 4: -1, 6: 1, 8: -1};

	var search = {}; // search records.
	var farthest = {d: null, steps: 0}; // store farthest steps
	var candidates = []; // store direction longer than 5 steps

	mainLoop:
	for(var i in directions)
	{
		var d = directions[i];
		var op = opposites[d];

		if(!search[d])
			search[d] = {x: this.x, y: this.y, steps: 0, completed: false};

		while(true)
		{
			var nextX = search[d].x;
			var nextY = search[d].y;

			if(d == 2 || d == 8)
				nextY = nextY + increment[d];

			if(d == 4 || d == 6)
				nextX = nextX + increment[d];

			if(!$gameMap.isPassable(nextX, nextY, op))
			{
				if(d == 8)
					break mainLoop;

				break;
			}

			search[d].x = nextX;
			search[d].y = nextY;

			if(search[d].steps > 8)
				break;

			search[d].steps++;
		}

		if(search[d].steps >= 5)
			candidates.push(d);

		if(search[d].steps > farthest.steps)
		{
			farthest.d = d;
			farthest.steps = search[d].steps;
		}
	}

	return [search[farthest.d].x, search[farthest.d].y];
}

//==================================================
// @Spriteset_Map
// - pushCharacter
//==================================================

Spriteset_Map.prototype.pushCharacter = function(event)
{
	var index = this._characterSprites.length;
	this._characterSprites.push(new Sprite_Character(event));
	this._tilemap.addChild(this._characterSprites[index]);
};

//==================================================
// @Scene_Map
// - createTimeWindow
// - pushCharacterSprite
// - &createAllWindows
// - &updateEncounter
//==================================================
Scene_Map.prototype.createTimeWindow = function()
{
	this._windowTime = new Window_Time($exe.time);
	this.addWindow(this._windowTime);
};

Scene_Map.prototype.pushCharacterSprite = function(event)
{
	this._spriteset.pushCharacter(event);
};

(function(parent)
{
	Scene_Map.prototype.createAllWindows = function()
	{
		Scene_Map.prototype.createTimeWindow.call(this);
		parent.createAllWindows.call(this);
	}

	Scene_Map.prototype.updateEncounter = function()
	{
		$gamePlayer.executeEncounter();

		if($gamePlayer.isEncountering())
		{
			SceneManager.push(Scene_Battle);
		}
	}
	
})(Exedr.protoCopy(Scene_Map, ['createAllWindows', 'updateEncounter']));

//============================
// @DataManager
// - createAllWindows
// - loadDataFile (callback on successfully loaded data)
// - loadMapData
//============================
(function(createGameObjects)
{
	DataManager.createGameObjects = function()
	{
		createGameObjects.call(this);
		$exe.listener.run('gameObjectCreation');
	}

	DataManager.loadDataFile = function(name, src, callback)
	{
		var xhr = new XMLHttpRequest();
		var url = 'data/' + src;
		xhr.open('GET', url);
		xhr.overrideMimeType('application/json');
		xhr.onload = function()
		{
			if(xhr.status < 400)
			{
				if(!callback)
				{
					window[name] = JSON.parse(xhr.responseText);
					DataManager.onLoad(window[name]);
				}
				else
				{
					var data = JSON.parse(xhr.responseText);
					callback(data);
					DataManager.onLoad(data);
				}
			}
		};

		xhr.onerror = function()
		{
			DataManager._errorUrl = DataManager._errorUrl || url;
		};

		if(!callback)
			window[name] = null;
		
		xhr.send();
	}

	DataManager.loadMapData = function(mapId, callback)
	{
		if(mapId > 0)
		{
			var filename = 'Map%1.json'.format(mapId.padZero(3));
			if(callback)
				this.loadDataFile(null, filename, callback);
			else
				this.loadDataFile('$dataMap', filename, callback);
		}
		else
		{
			this.makeEmptyMap();
		}
	}
})(DataManager.createGameObjects);

//==============================
// Initiate $exe global variable, a facade.
//==============================
var $exe = Exedr.create();

$exe.listener = new Exedr.listener($exe);

$exe.listener.on('gameObjectCreation', function()
{
	$exe.listener.run('engineInitiation');
	$exe.listener.run('gameStart');
});