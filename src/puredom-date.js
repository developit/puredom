/** @name puredom
 *	@namespace
 */
window.puredom = window.puredom || {};


/**	Functions for working with dates.<br />
 *	See http://php.net/strftime for formatting options.
 *	@namespace
 */
puredom.date = {
	/** @lends puredom.date */
	
	/** Returns the current timestamp, in milliseconds.
	 *	@function
	 *	@returns {Number} timestamp
	 */
	now : (
		Date.now ? function() {
			return Date.now();
		} : function() {
			return +new Date();
		}
	),
	
	/** Create a date, optionally from a string.<br />
	 *	This is a wrapper on new Date(str), adding support for more date formats and smoothing out differences between browsers.
	 *	@param {String} [str=now]	A date string, parsed and used to set the initial date.
	 *	@returns {Date} a new date object.
	 */
	create : function(str) {
		var date;
		if (str) {
			str = (str+'').replace(/^([0-9]{4})\-([0-9]{2})\-([0-9]{2})T([0-9]{2})\:([0-9]{2})\:([0-9]{2})\.[0-9]{3}Z$/, '$1/$2/$3 $4:$5:$6');
			date = new Date(str);
		}
		else {
			date = new Date();
		}
		return date;
	},
	
	/**	Parse a string with the given format into a Date object.
	 *	@param {String} str						A date string to parse
	 *	@param {String} [format="%d/%m/%Y"]		A date format string. See {@link http://php.net/strftime} for available fields.
	 *	@returns {Date|Boolean}	the date, or false on failure.
	 */
	parse : function(str, format) {
		format = format || "%d/%m/%Y";
		function setHours(hours, pm) {
			if (pm===false || pm===true) {
				temp.pm = pm===true;
			}
			if (hours || hours===0) {
				temp.hours = hours;
			}
			hours = temp.hours;
			if (temp.hours<12 && temp.pm) {
				hours -= 12;
			}
			var i = rdate.getDate();
			if (temp.hours===12 && temp.pm===false) {
				if (rdate.getHours()!==0 || pm===!!pm) {
					rdate.setHours(0);

				}
			}
			else {
				rdate.setHours(hours);
				rdate.setDate(i);
			}
		}
		var origStr = str,
			rdate = new Date(0),
			temp = {},
			weekdays = ['mo','tu','we','th','fr','sa','su'],
			replacers = {
				H : [/^[0-9]{1,2}/g, function(e){e=Math.round(e);setHours(e);}],
				I : [/^[0-9]{1,2}/g, function(e){e=Math.round(e);setHours(e);}],
				p : [/^[AP]M/gi, function(e){setHours(null, e.toLowerCase()==="pm");}],
				M : [/^[0-9]{1,2}/g, function(e){rdate.setMinutes(Math.round(e));}],
				a : [/^(Mon|Tue(s?)|Wed|Thu|Fri|Sat|Sun)/i, function(){}],									// dummy
				A : [/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i, function(){}],			// dummy


				d : [/^[0-9]{1,2}/g, function(e){temp.date=Math.round(e);rdate.setDate(temp.date);}],
				m : [/^[0-9]{1,2}/g, function(e){temp.month=Math.round(e)-1;rdate.setMonth(temp.month);}],
				B : [new RegExp('^('+this.months.join("|")+')','gi'), function(e){temp.month=date._getMonthIndex(e);rdate.setMonth(temp.month);}],
				b : [/^(Jan|Feb|Mar|Apr|May|Jun(e?)|Jul(y?)|Aug|Sep(t?)|Oct|Nov|Dec)/gi, function(e){temp.month=date._getMonthIndex(e);rdate.setMonth(temp.month);}],
				y : [/^[0-9]{2}/g, function(e){e=Math.round(e)+1900;if(e<1950){e+=100;}rdate.setFullYear(e);}],		// wrap 2-digit dates at 1950/2050
				Y : [/^[0-9]{4}/g, function(e){temp.year=Math.round(e);rdate.setFullYear(temp.year);}]
			},
			index, rep, r;
		replacers.l = replacers.I;
		replacers.e = replacers.d;
		replacers.P = replacers.p;
		replacers.h = replacers.b;
		
		for (index=0; index<format.length; index++) {
			if (format.charAt(index)==="%") {
				rep = null;
				if (str.charAt(0)===' ' && format.charAt(index)==='%') {
					str = str.substring(1);
				}
				for (r in replacers) {
					if (replacers.hasOwnProperty(r) && format.substring(index+1, index+1+r.length)===r) {
						rep = replacers[r];
						str = str.replace(rep[0], function(e){rep[1](e);return '';});
						index += rep.length-1;		// advance past the used symbol in format str
						break;
					}
				}
				//if (!rep) {
				//	index += 1;
				//}
			}
			else {
				if (str.charAt(0)===format.charAt(index)) {
					str = str.substring(1);
				}
			}
		}
		
		if (temp.month || temp.month===0) {
			rdate.setMonth(temp.month);
		}
		if (temp.year || temp.year===0) {
			rdate.setFullYear(temp.year);
		}
		
		//console.log('PARSE: format="'+format+'", orig="'+origStr+'", remain="'+str+'", date='+rdate);
		
		return rdate;
	},
	/** Alias of {@link puredom.date.parse}
	 *	@see puredom.date.parse
	 *	@deprecated
	 *	@private
	 */
	unformat : function(){return this.parse.apply(this,arguments);},
	
	/**	Get a formatted string representation of a Date object.
	 *	@param {String} date					A date object to convert
	 *	@param {String} [format="%d/%m/%Y"]		A date format string. See {@link http://php.net/strftime} for available fields.
	 *	@returns {String|Boolean}	the formatted date string, or false on failure.
	 */
	format : function(date, format) {
		format = format || "%d/%m/%Y";
		
		if (!date || date.constructor!==Date || !date.toDateString) {
			return false;
		}
		
		var dateStr = date.toDateString();
		if (!dateStr || dateStr.toLowerCase()==="invalid date") {
			return false;
		}
		
		if (dateStr==='NaN') {	// only trips in IE ("3 is not an object")
			return false;
		}
		
		var dateParts = dateStr.split(" "),
			hours = date.getHours(),
			hv = ((hours+11)%12)+1,
			m = date.getMonth()+1,
			replacers = {
				H : hours,						// 24 hour time
				I : (hv<10?"0":"") + hv,		// 12 hour time, leading 0
				l : hv,							// 12 hour time
				p : hours>11?"PM":"AM",
				P : hours>11?"pm":"am",
				M : (date.getMinutes()<10?"0":"") + date.getMinutes(),
				S : (date.getSeconds()<10?"0":"") + date.getSeconds(),		// seconds
				a : dateParts[0],
				A : this.weekdays[date.getDay()],
				d : dateParts[2],
				e : Math.round(dateParts[2]),
				m : (m<10?"0":"") + m,
				B : this.months[Math.round(dateParts[1])],
				b : dateParts[1],
				h : dateParts[1],
				y : dateParts[3].substring(2),
				Y : dateParts[3]
			};
		
		return format.replace(/%[HIlpPMSaAdemBbhyY]/gm, function(s) {
			var v = replacers[s.charAt(1)+''];
			return (v || v===0 || v===false) ? v : s;
		});
	},
	
	/** @private */
	_getMonthIndex : function(m){
		m = m.substring(0,3).toLowerCase();
		for (var x=0; x<this.months.length; x++) {
			if (this.months[x].substring(0,3).toLowerCase()===m) {
				return x;
			}
		}
		return -1;
	},
	
	/** Weekday names
	 *	@type String[]
	 */
	weekdays : ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
	/** Month names
	 *	@type String[]
	 */
	months : ["January","February","March","April","May","June","July","August","September","October","November","December"]
};