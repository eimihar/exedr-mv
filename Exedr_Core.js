//==============================================
// Exedr-mv RPG Maker MV Engine
// by Remi @ Eimihar @ Ahmad Rahimie
// http://github.com/eimihar/exedr-mv
// The core js script written for RPG Maker MV game development
// status : in-complete
//==============================================
var Exedr = Exedr || {};

/**
* Storage instance.
*/
Exedr.data = new function()
{
	this.cronStorage = {};
};

//=================================
// Exedr.registry
// - A general listener
// @param Exedr object
//=================================
Exedr.listener = new function()
{
	this.data = {};

	this.on = function(name, callback)
	{
		this.data[name] = callback;
	}

	this.run = function(name)
	{
		if(this.data[name])
			this.data[name](this);
	}
};

/**
* Dependency container
*/
Exedr.container = new function()
{
	this.data = {};

	this.resolves = {};

	this.register = function(key, callback)
	{
		this.data[key] = callback;
	}

	this.registerMany = function(registry)
	{
		for(var key in registry)
			this.register(key, registry[key]);
	}

	this.get = function(key)
	{
		if(!this.resolves[key])
		{
			if(typeof(this.data[key]) == 'function')
				this.resolves[key] = this.data[key]();
			else
				this.resolves[key] = this.data[key];
		}

		return this.resolves[key];
	}
};

//===================================
// Exedr.loader
//===================================
Exedr.loader = new function()
{
	this.loadEvents = function(variable, mapId)
	{
		if(!Exedr.data[variable])
			Exedr.data[variable] = {};

		DataManager.loadMapData(mapId, function(dataMap)
		{
			dataMap.events.forEach(function(ev)
			{
				if(ev)
					Exedr.data[variable][ev.id] = ev;
			});
		});
	}
};

//===================================
// Exedr.actorManager
//==================================
Exedr.actorManager = new function()
{
	this.aliases = {};
	this.storage = {};

	this.setAliases = function(key, aliases)
	{
		for(var i in aliases)
			this.aliases[aliases[i]] = key; 
	}

	this.has = function(key)
	{
		if(this.aliases[key])
			key = this.aliases[key];

		return this.storage[key] ? true : false;
	}

	this.data = function(key)
	{
		if(this.aliases[key])
			key = this.aliases[key];

		return this.storage[key] ? this.storage[key] : this.storage[key] = new function(key)
		{
			var key = key;
			this.faceIndexes = {};
			this.faceName = null;
			this.index = null;

			this.isExists = function()
			{
				return this.faceName ? true : false;
			}

			this.setDefaultIndex = function(index)
			{
				this.index = index;

				return this;
			}

			/**
			* file name for this actor
			*/
			this.setFaceName = function(name)
			{
				this.faceName = name;

				return this;
			}

			this.setFaceIndexes = function(data)
			{
				for(var key in data)
					this.faceIndexes[key] = data[key];

				return this;
			}

			/**
			* Set both face name and indexes.
			*/
			this.setFace = function(name, data)
			{
				return this.setFaceName(name).setFaceIndexes(data);
			}

			/**
			* @return array [name, index]
			*/
			this.getFace = function(key)
			{
				var faceIndex = this.index ? this.index : 0;

				if(this.faceIndexes[key])
					faceIndex = this.faceIndexes[key][Math.randomInt(this.faceIndexes[key].length)] - 1;

				return [this.faceName, faceIndex];
			}
		}(key);
	}

	this.register = function()
	{
		var dataActors = Exedr.container.get('dataActors');
		for(var i in dataActors)
		{
			var actor = dataActors[i];

			if(actor)
			{
				var name = actor.name.toLowerCase();
				var faceName = actor.faceName;
				var faceIndex = actor.faceIndex;
				// var tags = Exedr.util.readTags(actor.note);
				// var aliases = [];
				var faces = {};
				var aliases = [];

				var actorData = this.data(name);
				actorData.setDefaultIndex(faceIndex);

				for(var key in actor.meta)
				{
					switch(key)
					{
						case 'alias':
							var alias = actor.meta[key].split(',');

							alias.forEach(function(value)
							{
								aliases.push(value.trim());
							});
						break;
						case 'face':
							var faceList = actor.meta[key].split(';');

							faceList.forEach(function(value)
							{
								var face = value.trim().split('=');
								if(face[0].trim() == 'default')
									actorData.setDefaultIndex(face[1].trim()-1);
								else
									faces[face[0].trim()] = face[1].trim().split(',');
							});
						break;
					}
				}

				this.setAliases(name, aliases);
				actorData.setFace(faceName, faces);
			}
		}
	}
}();

//=============================
// Exedr.time 
// - A Time Engine
// - minutes
// - hours
// - days
//=============================
Exedr.time = new function()
{
	var framely = {};

	this._seconds = 0;
	this._frames = 0;
	this._multiplier = 0;
	this._increment = 0;
	this._running = false;

	this.isRunning = function()
	{
		return this._running;
	}

	this.pause = function()
	{
		this._running = false;
	}

	this.begin = function(initial)
	{
		if(initial)
			this._seconds = initial;

		this._running = true;
	}

	this.continue = function()
	{
		this._running = true;
	}

	this.minutes = function()
	{
		return this._seconds;
	}

	this.hours = function()
	{
		return Math.floor(this.minutes() / 60);
	}

	this.days = function()
	{
		return Math.floor(this.minutes() / 1440);
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
		if(!this._running)
			return;

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
		Exedr.chron.update();
	}

	this.onEveryFrame = function(callback)
	{
		framely[Math.random()+''] = callback;
	}

	this.setSpeed(1);
};

//=======================
// Exedr.time.clock
// - The game clock
// - minute (current minute of an hour)
// - hour (hour of the day)
// - isDay(day)
// - current (string of stringified time) [24 hour]
// - isBetweenHour
// - isBetween
// - createText
//=======================
Exedr.clock = new function(time)
{
	this.time = time;
	this.visible = false;

	this.minute = function()
	{
		return this.time.minutes() % 60;
	}

	this.hour = function()
	{
		return Math.floor(this.time.minutes() / 60) % 24;
	}

	this.day = function()
	{
		return Math.floor(this.time.minutes() / 60 / 24) % 7;
	}

	this.begin = function(initial)
	{
		this.showClock();
		this.time.begin(initial);
	}

	this.continue = function()
	{
		this.showClock();
		this.time.continue();
	}

	this.hideClock = function()
	{
		this.visible = false;
	}

	this.showClock = function()
	{
		this.visible = true;
	}

	this.isRunning = function()
	{
		return this.time.isRunning();
	}

	this.pause = function(hideClock)
	{
		if(hideClock)
			this.hideClock();

		this.time.pause();
	}

	this.isDay = function(day)
	{
		var days = {
			SUNDAY : 1,
			MONDAY : 2,
			TUESDAY : 3,
			WEDNESDAY : 4,
			THURSDAY : 5,
			FRIDAY : 6,
			SATURDAY : 7
		};

		return days[day.toUpperCase()] == this.day();
	}

	this.current = function()
	{
		return Exedr.util.stringifyTime(this.hour(), this.minute());
	}

	/**
	* @param {int} first
	* @param {int} second
	* @return bool
	**/
	this.isBetweenHour = function(first, second)
	{
		return first <= this.hour() && second >= this.hour();
	}

	/**
	* @param {string} first
	* @param {string} second
	* @return bool
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
		var text = Exedr.util.stringifyTime(hour, minute)+' '+amPm;

		return text;
	}
}(Exedr.time);

//===================
// Exedr.chron
// - The game time-based eventing engine
// - setDaily
// - setTimeout
// - setInterval
// - onEvery
// - onEveryMinute
// - setMinutelyInterval
//===================
Exedr.chron = new function(clock)
{
	var daily = {};
	var clock = clock;
	this.clock = clock;
	var interval = {};
	var minutely = {};
	// var storage = {};

	var calculateMinutes = function(startHour, startMinute, endHour, endMinute)
	{
		var hour = endHour - startHour;
		var minute = endMinute - startMinute;

		var minutes = (hour * 60) + minute;

		return minutes < 0 ? 1440 + minutes : minutes;
	}

	var intervalInstance = function(option, chron)
	{
		var chron = chron;
		var callback = option.callback;
		var minutes = option.minute;
		var repeat = option.repeat != null ? option.repeat : true;
		var origin = option.origin != null ? option.origin : minutes;
		var key = Math.random()+'';
		var minute = null;
		var old;

		this.start = function(minutes)
		{
			minute = chron.clock.time.minutes() + minutes;

			var storage = chron.getStorage();

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
		return Exedr.data.cronStorage;
	}

	/**
	* Set daily event
	* @param {int} hour
	* @param {int} minute
	* @param {Closure} callback
	* @param {bool} repeat
	*/
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

	/**
	* Set timeout event
	* @param {int} minute
	* @param {closure} callback
	*/
	this.setTimeout = function(minute, callback)
	{
		return this.setInterval(minute, callback, false);
	}

	/**
	* Set a saved interval by minute amount
	* @param {int} minute
	* @param {closure} callback
	* @param {bool} repeat
	*/
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
	* Set a non saved interval
	* @param {int} minute
	* @param {closure} callback
	* @param {bool} save
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

	/**
	* Alias to setMinutelyInterval
	* @param {closure} callback
	*/
	this.onEveryMinute = function(callback)
	{
		return this.setMinutelyInterval(callback);
	}

	/**
	* Run something every minute
	* @param {closure} callback
	*/
	this.setMinutelyInterval = function(callback)
	{
		minutely[Math.random()] = callback;
	}

	/**
	* Minutely run update
	* - execute minutely callbacks
	* - execute interval based callbacks
	* - execute saved callback
	* - execute Exedr.game.update
	**/
	this.update = function()
	{
		var minutes = clock.time.minutes();

		Exedr.game.update();

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

		var storage = this.getStorage();

		if(storage[minutes])
		{
			for(var key in storage[minutes])
			{
				var intervalInst = storage[minutes][key];
				intervalInst.update();
			}
		}
	}

}(Exedr.clock);

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
Exedr.daytime = new function(clock)
{
	this.data = {
		MIDNIGHT : ['00:00', [-125, -125, 0, 125]],
		DEEPMIDNIGHT : ['01:00', [-175, -175, 0, 125]],
		DAWN : ['4:00', [-150, -100, 0, 125]],
		PRESUNRISE : ['6:00', [-75, -75, 25, 125]],
		// SUNRISE : ['7:00', [-20, -20, 0, 50]],
		MORNING : ['7:00', [10, 10, 0, -20]],
		NOONSTART : ['11:30', [45, 45, 0, -25]],
		NOONEND : ['15:00', [0, 0, 0, 0]],
		PRESUNSET : ['17:00', [0, -50, -100, 0]],
		SUNSET : ['18:00', [0, -100, -100, 75]],
		NIGHT : ['20:00', [-150, -100, 0, 125]]
	};

	this.callbacks = {};

	this.temporary = false;

	var gameScreen = function()
	{
		return Exedr.container.get('gameScreen');
	}

	this.pause = function()
	{
		this.paused = true;
	}

	this.unpause = function()
	{
		this.paused = false;
	}

	this.continue = function()
	{
		if(this.current)
			this.set('CURRENT', true);
	}

	this.set = function(preset, instant, temporary)
	{
		if(instant && preset != 'CURRENT' && !this.current)
			this.current = preset;

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
		var duration = instant ? 1 : 60;
		gameScreen().startTint(this.data[preset][1], duration);

		// execute callbacks
		if(this.callbacks[preset])
		{
			for(var key in this.callbacks[preset])
			{
				this.callbacks[preset][key]();
			}
		}
	}

	this.isDay = function()
	{
		return isBetween('PRESUNRISE', 'NIGHT');
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
			var data = Exedr.daytime.data[preset];
			var time = Exedr.util.parseTime(data[0]);

			// console.log(parseInt(time[0])+':'+parseInt(time[1]));
			(function(preset)
			{
				Exedr.chron.setDaily(time.hour, time.minute, function()
				{
					// console.log(preset);
					Exedr.daytime.set(preset);
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

		return this.callbacks[preset][key] = Exedr.util.data(callbacks, function()
		{
			delete context.callbacks[preset][key];
		});
	}
}(Exedr.clock);

//=================================
// Exedr.weather
// - A weather management engine
//=================================
Exedr.weather = new function()
{
	this.current = null;

	this.power = {
		'storm' : 30,
		'rain' : 20
	};

	this.begin = function(type)
	{
		this.start(type, 60);
	}

	this.gameScreen = function()
	{
		return Exedr.container.get('gameScreen');
	}

	/**
	* @param {string} type
	* @param {int} duration (default : 1)
	* @param {float} power (e.g. : 0.9) (default : 1)
	*/
	this.start = function(type, multiplier, instant)
	{
		var multiplier = multiplier ? multiplier : 1;
		this.setBgs(type, multiplier, instant);

		var power = multiplier * this.power[type];

		var duration = instant ? 1 : 60;

		this.current = [type, power, duration, multiplier];

		this.gameScreen().changeWeather(type, power, duration);
	}

	this.setInside = function()
	{
		this.gameScreen().clearWeather();

		if(this.current)
			this.setBgs(this.current[0], this.current[3] * 0.3, true);
	}

	// instantly continue weather.
	this.continue = function()
	{
		if(!this.current)
			return;

		this.start(this.current[0], this.current[3], true);

		// $gameScreen.changeWeather(this.current[0], this.current[1], this.current[2]);
	}

	this.stop = function(instant)
	{
		if(instant)
		{
			this.gameScreen().clearWeather();
			AudioManager.stopBgs();
		}
		else
		{
			this.current = null;
			this.gameScreen().changeWeather('none', 0, 60);
			// AudioManager.stopBgs();
			AudioManager.fadeOutBgs(3);
		}
	}

	/**
	* @param {string} type
	* @param {float} power in percentage (e.g. 0.5)
	*/
	this.setBgs = function(type, power, instant)
	{
		var bgses = {
			'storm' : {'name' : 'Storm2', pan: 0, pitch: 50, volume: 90},
			'rain' : {'name' : 'Storm1', pan: 0, pitch: 70, volume: 15}
		};

		var bgs = bgses[type];

		if(instant)
			bgs.pitch--;

		bgs.volume = (power ? power : 1) * bgs.volume;

		AudioManager.playBgs(bgs);

		if(!instant)
			return AudioManager.fadeInBgs(3);
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
		if(this.gameScreen()._weatherDuration > 0)
		{
			var d = this.gameScreen()._weatherDuration;
			var t = this.gameScreen()._weatherPowerTarget;

			this.gameScreen()._weatherPower = (this.gameScreen()._weatherPower * (d - 1) + t) / d;
			this.gameScreen()._weatherDuration--;

			if(this.gameScreen()._weatherPower == 0 && this.gameScreen()._weatherDuration == 0)
				this.gameScreen()._weatherType = 9;
		}
	}
};

//==================================
// Exedr.follower 
// - A simpler interface to get follower instance
//==================================
Exedr.follower = function(index)
{
	var index = index ? index : 0;
	return $gamePlayer._followers.follower(index);
};

Exedr.quantum = new function()
{
	this.update = function()
	{

	}
}(Exedr.clock);

//=================================
// Exedr.Util
// - Utility class
//=================================
Exedr.util = new function()
{
	this.data = function(data, onClear)
	{
		if(onClear)
			data.onClear = onClear;

		data.clear = function()
		{
			data.onClear();
		}

		return data;
	}

	/**
	* @return [key, value, replaced text]
	*/
	this.readTag = function(text)
	{
		var match = text.match(/<(.*?)>/);

		if(!match)
			return false;

		var result = match[1].split(':');

		return [result[0], result[1].trim(), text.replace(match[0], '')];
	}

	/**
	* @return array of tag data and text balance.
	*/
	this.readTags = function(text)
	{
		var balance = null;
		var tags = {};

		while(true)
		{
			var match = this.readTag(text);
			if(!match)
				break;

			tags[match[0]] = match[1];
			text = match[2];
			balance = text;
		}

		return tags;
	}

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

Window_Time.prototype.initialize = function(clock)
{
	Window_Base.prototype.initialize.call(this, Graphics.boxWidth - 140, 0, 140, this.fittingHeight(1));
	this.backOpacity = 0;
	this.windowskin = ImageManager.loadSystem('Windowless');
	this.clock = clock;
	this.refresh();
};

Window_Time.prototype.open = function() {
    this.refresh();
    Window_Base.prototype.open.call(this);
};

Window_Time.prototype.refreshTime = function()
{
	this.contents.clear();
	var text = this.clock.createText();
	this.contents.drawText(text, 0, 10, 100, 10, 'right');
};

Window_Time.prototype.refresh = function()
{
	if(this.clock.visible)
		this.refreshTime();
	else
		this.contents.clear();
};

Window_Time.prototype.update = function()
{
	var context = this;

	// refresh content every seconds.
	this.clock.time.update(function()
	{
		context.refresh();
	});
};

//==================================================
// @Game_Followers
// - pos (check if there's any follower in the given position)
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
// @Game_Follower
// - stopFollowing (will stop following character)
// - follow
// isFollowing
// &chaseCharacter
// * Related feature
//  - Game_Character.moveTo
//==================================================

Game_Follower.prototype.stopFollowing = function()
{
	this._stopFollowing = true;

	return this;
}

Game_Follower.prototype.follow = function()
{
	this._stopFollowing = false;

	return this;
}

Game_Follower.prototype.isFollowing = function()
{
	return this._stopFollowing == true ? false : true;
};

(function(parent)
{
	Game_Follower.prototype.chaseCharacter = function(character)
	{
		if(!this.isFollowing())
			return;

		if(this.isMoving())
			return;

		parent.chaseCharacter.call(this, character);
	}
})(Exedr.protoCopy(Game_Follower, ['chaseCharacter']));

//==================================================
// @Game_Character
// - moveTo
// - executeRoute
// - clearDestination
// - hasDestination
// - &update
//==================================================
Game_Character.prototype.moveTo = function(x, y, wait)
{
	var wait = wait || wait === false ? wait : true;
	this._destinationX = x;
	this._destinationY = y;
	this._originalThrough = this._through;
	this.setThrough(false);

	if(wait)
	{
		$gameMap._interpreter.wait(1);
		$gameMap._interpreter._character = this;
	    $gameMap._interpreter.setWaitMode('moving');
	}
};

Game_Character.prototype.executeRoute = function(list, wait)
{
	var wait = wait || wait === false ? wait : true;

	var movementMaps = {
		left : Game_Character.ROUTE_MOVE_LEFT,
		right : Game_Character.ROUTE_MOVE_RIGHT,
		up : Game_Character.ROUTE_MOVE_UP,
		down : Game_Character.ROUTE_MOVE_DOWN,
		turn_left : Game_Character.ROUTE_TURN_LEFT,
		turn_right : Game_Character.ROUTE_TURN_RIGHT,
		turn_up : Game_Character.ROUTE_TURN_UP,
		turn_down : Game_Character.ROUTE_TURN_DOWN
	};

	var _list = [];

	for(var key in list)
	{
		if(movementMaps[list[key]])
			_list.push({code: movementMaps[list[key]], indent: null});
	}

	_list.push({code: 0});

	var moveRoute = {
		list : _list,
		repeat : false,
		skippable : false,
		wait : true
	};

	this.forceMoveRoute(moveRoute);

	if(wait)
	{
	 	$gameMap._interpreter._character = this;
	    $gameMap._interpreter.setWaitMode('route');
	}
};

Game_Character.prototype.clearDestination = function()
{
	this._destinationX = null;
	this._destinationY = null;
	this.setThrough(this._originalThrough);
	this._isMoveRouteForcing = false;
};

Game_Character.prototype.hasDestination = function()
{
	return this._destinationX && this._destinationY;
};

(function(parent)
{
	Game_Character.prototype.update = function()
	{
		parent.update.call(this);

		if(this.hasDestination())
		{
			var x = this._destinationX;
			var y = this._destinationY;

			if(x == this._realX && y == this._realY)
				return this.clearDestination();

			if(!this.isMoving())
			{
				var direction = this.findDirectionTo(x, y);

				if(direction > 0)
					this.moveStraight(direction);
			}
		}
	};
})(Exedr.protoCopy(Game_Character, ['update']));

//==================================================
// Game_TroopEvents
// - Collection of Game_TroopEvent
//==================================================
function Game_TroopEvents()
{
	this.initialize.apply(this, arguments);
};

Game_TroopEvents.prototype.constructor = Game_TroopEvents;

Game_TroopEvents.prototype.add = function(troopEvent)
{
	this.data[troopEvent.troopEventId()] = troopEvent;
};

Game_TroopEvents.prototype.remove = function(troopEvent)
{

};

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
	Exedr.time.onEveryFrame(function()
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
	return Exedr.data.troopEvents[this._troopEventId];
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
		Exedr.listener.run('gameMapSetup');
	}
})(Exedr.protoCopy(Game_Map, ['setup']));

Game_Map.prototype.createTroopEvent = function(troopId, x, y)
{
	// base the new id to the length of the current dataMap.events
	var troopEventId = Exedr.data.troopEventMap[troopId];
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
// - follower
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

Game_Player.prototype.follower = function(index)
{
	var index = index ? index : 0;

	return this._followers.follower(index);
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
	this._windowTime = new Window_Time(Exedr.clock);
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

(function(parent)
{
	Game_Message.prototype.addText = function(text)
	{
		var actorTags = text.match(/<(.*?)>/);

		if(actorTags && text.indexOf(actorTags[0]) === 0)
		{
			console.log(actorTags);
			var actorTag = actorTags[1].split(':');
			text = text.replace(actorTags[0], '');

			if(Exedr.actorManager.has(actorTag[0]))
			{
				var actorFace = Exedr.actorManager.data(actorTag[0]).getFace(actorTag[1] ? actorTag[1] : 0);
				this.setFaceImage(actorFace[0], actorFace[1]);
			}
			// actor not found...
			// use his name instead.
			else
			{
				text = actorTag[0]+' : '+text;
			}
		}

		parent.addText.call(this, text);
	}
})(Exedr.protoCopy(Game_Message, ['addText']));

//=======================================
// @Game_Interpreter
// * Related methods
//  - Game_Character.moveTo
//=======================================
(function(parent)
{
	Game_Interpreter.prototype.updateWaitMode = function()
	{
		if(this._waitMode == 'moving')
			if(this._character.isMoving())
				return true;

		return parent.updateWaitMode.call(this);
	}
})(Exedr.protoCopy(Game_Interpreter, ['updateWaitMode']));


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
		Exedr.listener.run('gameObjectCreation');
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
// var $exe = Exedr.create();

// Exedr.listener = new Exedr.listener($exe);

Exedr.listener.on('gameObjectCreation', function()
{
	Exedr.listener.run('engineInitiation');
	Exedr.listener.run('gameStart');
});