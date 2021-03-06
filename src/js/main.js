﻿function GooglePlusCommunitiesNotifications() {
	this.communities = [];
	this.total       = 0;
	this.timer       = null;
	this.popup       = null;
	this.oz          = null;
}

GooglePlusCommunitiesNotifications.prototype = {
	HOME_URL    : 'https://plus.google.com/',
	BASE_URL    : 'https://plus.google.com/u/0/',
	INIT_URL    : '_/initialdata',
	COMMUS_URL  : '_/communities/getcommunities',
	STREAM_URL  : '_/stream/getactivities/',
	LANDING_URL : '_/communities/landing',
	PLUSONE_URL : '_/plusone',

	init : function(callback) {
		var self = this;

		if (self.timer) {
			clearTimeout(self.timer);
			self.timer = null;
		}

		var popup = chrome.extension.getViews({type: 'popup'})[0];
		if (popup && !callback) {
			self.timer = setTimeout(function() {
				self.init.call(self);
			}, 30 * 1000);
			return;
		}

		if (!self.oz || callback) {
			self.getInitData(1, function(data) {
				self.oz = data;
				self.setCommunities(callback);
			});
		}
		else {
			self.setCommunities(callback);
		}
	},

	setCommunities : function(callback) {
		var self = this;

		self.getCommunities(function(communities) {
			self.communities = [];
			self.total = 0;

			var $article = $('article').empty();
			$ul = $('<ul/>', {
				'class' : 'infinite-tabs'
			});
			$article.append($ul);

			communities.forEach(function(community) {
				var $li = $('<li/>', {
					id         : 'community_' + community.id,
					'data-id'  : community.id,
					'class'    : 'community',
					'data-url' : self.HOME_URL + 'communities/' + community.id
				});

				$li.appendTo($ul);

				var $a = $('<a/>', {
					href  : '#tab_' + community.id,
					title : community.name
				}).appendTo($li);

				$('<img/>', {
					src : community.icon,
					alt : community.name
				}).appendTo($a);

				self.communities.push(community);
			});

			self.updateBadge();

			self.timer = setTimeout(function() {
				self.init.call(self);
			}, 30 * 1000);

			if (typeof callback == 'function') callback();
		});
	},

	updateBadge : function() {
		var self = this;
		var total = 0;
		var hidden_communities = self.getHiddenCommunities();
		self.communities.forEach(function(community) {
			if ($.inArray(community.id, hidden_communities) == -1) {
				total += community.unread;
			}
		});
		chrome.browserAction.setBadgeBackgroundColor({color : [255, 0, 0, 255]});
		if (total) {
			chrome.browserAction.setBadgeText({text : '' + total});
		}
		else {
			chrome.browserAction.setBadgeText({text : ''});
		}
		self.total = total;
		updateBadgesOnPopup();
	},

	getCommunities : function(callback) {
console.log('getCommunities');
		var self = this;
		var communities = [];
		$.ajax({
			type     : 'POST',
			url      : self.BASE_URL + self.COMMUS_URL + '?' +
				$.param({
					hl     : 'en',
					_reqid : self.getReqid(),
					rt     : 'j'
				}),
			dataType : 'text',
			data     : {
				'f.req' : '[[1]]',
				at      : self.oz[15]
			},
			success  : function(data) {
				var text = data.substr(5).replace(/(\\n|\n)/g, '');
				Sandbox.evalJSON(text, function(json) {
					var data = self.getDataByKey(json[0], 'sq.gsr');
					if (data && data[2]) {
						data[2].forEach(function(community) {
							communities.push({
								id     : community[0][0][0],
								name   : community[0][0][1][0],
								line   : community[0][0][1][1],
								icon   : self.getAbsoluteURL(community[0][0][1][3]) || chrome.extension.getURL('img/c-icon-250.png'),
								desc   : community[0][0][1][8],
								unread : community[0][4][1],
								latest : community[0][4][2],
								last   : community[0][4][3]
							});
						});
						communities.sort(function(a, b) {
							if (b.unread == a.unread) {
								return (b.latest - a.latest);
							}
							return (b.unread - a.unread);
						});
					}
					callback(communities);
				});
			},
			error : function() {
console.log('no communities');
				callback(communities);
			}
		});
	},

	getInitData : function(key, callback) {
console.log('getInitData');
		var self = this;

		$.ajax({
			type     : 'POST',
			url      : self.BASE_URL + self.INIT_URL + '?' +
				$.param({
					hl     : 'en',
					_reqid : self.getReqid(),
					rt     : 'j'
				}),
			dataType : 'text',
			data     : {
				key : key
			},
			success  : function(data) {
				var text = data.substr(5).replace(/(\\n|\n)/g, '');
				Sandbox.evalJSON(text, function(json) {
					var data = self.getDataByKey(json[0], 'idr');
					if (data && data[1]) {
						Sandbox.evalJSON(data[1], function(data) {
							callback(data[key]);
						});
					}
					else {
						callback(null);
					}
				});
			}
		});
	},

	getNotifications : function(community_id, callback) {
console.log('getNotifications');
		var self = this;

		var community = self.getCommunityDataById(community_id);
		if (!community) return callback([]);

		$.ajax({
			type     : 'POST',
			url      : self.BASE_URL + self.STREAM_URL + '?' +
				$.param({
					hl     : 'en',
					_reqid : self.getReqid(),
					rt     : 'j'
				}),
			dataType : 'text',
			data     : {
				'f.req' : '[[18,2,"' + community_id + '",null,null,20' +
					',null,"social.google.com",[],null,null,null,null,null,null,[],null,null,0,null,null,0,null,15,null,[[1002],[],0,0],null,null,0,null,null,0]]',
				at      : self.oz[15]
			},
			success  : function(data) {
				var text = data.substr(5).replace(/(\\n|\n)/g, '');
				Sandbox.evalJSON(text, function(json) {
					var data = self.getDataByKey(json[0], 'os.nu');
					var notes = [];
					if (data && data[1]) {
						self.makeNotesArray(data).forEach(function(note) {
							var parsed_note = self.getOneNotificationData(community_id, note);
							if (parsed_note) notes.push(parsed_note);
						});
						notes.sort(function(a, b) {
							return (b.updated - a.updated);
						});
					}
					callback(notes);
				});
			}
		});
	},

	makeNotesArray : function(data) {
		var notes = [];
		data[1][7].forEach(function(note) {
			if (note[0] === 1002) {
				var data = (note[1] && note[1][33558957]) ? note[1][33558957] :
					(note[6] && note[6][33558957]) ? note[6][33558957] : null;
				if (data) {
					notes.push(data);
				}
			}
		});
		return notes;
	},

	_getNotifications : function(community_id, callback) {
console.log('_getNotifications');
		var self = this;

		var community = self.getCommunityDataById(community_id);
		if (!community) return callback([]);

		$.ajax({
			type     : 'POST',
			url      : self.BASE_URL + self.LANDING_URL + '?' +
				$.param({
					hl     : 'en',
					_reqid : self.getReqid(),
					rt     : 'j'
				}),
			dataType : 'text',
			data     : {
				'f.req' : '["' + community_id + '",null,false]',
				at      : self.oz[15]
			},
			success  : function(data) {
				var text = data.substr(5).replace(/(\\n|\n)/g, '');
				Sandbox.evalJSON(text, function(json) {
					var data = self.getDataByKey(json[0], 'sq.gslr');
					var notes = [];

					if (data && data[6]) {
						data[6][0][0].forEach(function(note) {
							var parsed_note = self.getOneNotificationData(community_id, note);
							if (parsed_note) notes.push(parsed_note);
						});
						notes.sort(function(a, b) {
							return (b.updated - a.updated);
						});

						community.unread = 0;
						self.updateBadge();
					}
					callback(notes);
				});
			}
		});
	},

	markAllAsRead : function(community_id, callback) {
console.log('markAllAsRead');
		var self = this;

		var community = self.getCommunityDataById(community_id);
		if (!community) return callback();

/*
		$.ajax({
			type     : 'POST',
			url      : self.BASE_URL + self.LANDING_URL + '?' +
				$.param({
					hl     : 'en',
					_reqid : self.getReqid(),
					rt     : 'j'
				}),
			dataType : 'text',
			data     : {
				'f.req' : '["' + community_id + '",null,false]',
				at      : self.oz[15]
			},
			success  : function(data) {
			}
		});
*/

		community.unread = 0;
		community.last = 1000 * new Date();
		self.updateBadge();
		callback();
	},

	getCommunityDataById : function(community_id) {
		for (var i = 0, len = this.communities.length ; i < len ; i++) {
			if (this.communities[i].id == community_id) {
				return this.communities[i];
			}
		}
		return null;
	},

	getResourceDataById : function(resources, id) {
		for (var i = 0, len = resources.length ; i < len ; i++) {
			if (resources[i][3] == id) {
				return resources[i];
			}
		}
		return null;
	},

	getOneNotificationData : function(community_id, json) {
console.log('getOneNotificationData');
		var self = this;

		var community = self.getCommunityDataById(community_id);
		if (!community) return null;

		if (json[108][4] === 2) { // moderated
			return null;
		}

		var updated = json[5] * 1000; // posted
		if (json[7].length) { // last commented
			updated = json[7][json[7].length - 1][3] * 1000;
		}
		if (json[70] && (json[70] > updated)) { // edited
			updated = json[70];
		}
//		if (json[73][6] && ((json[73][6] * 1000) > updated)) { // +1'd
//			updated = json[73][6] * 1000;
//		}

		var note = {
			id        : json[8],
			url       : self.HOME_URL + json[21],
			text      : json[47] || json[4],
				// json[4]  : html : it's in reshared or itself
				// json[20] : text : it's in reshared or itself
				// json[47] : html : it's commented on resharing or undefined
				// json[48] : text : it's commented on resharing or undefined
			posted    : json[5], // posted, json[38]
			updated   : updated / 1000,
			actor     : {
				id   : json[16],
				name : json[3],
				icon : self.getAbsoluteURL(json[18]) || chrome.extension.getURL('img/p-icon-48.png'),
				url  : self.HOME_URL + ((json[24].substr(0, 2) === './') ? json[24].substring(2) : json[24])
			},
			stream    : {
				id   : json[108][3],
				name : json[108][2],
				url  : self.HOME_URL + 'communities/' + json[108][0] + '/stream/' + json[108][3]
			},
			replies   : json[93],
			plusones  : json[73][16],
			is_plused : json[73][13],
			reshares  : json[96],
			is_new    : ((json[5] * 1000) > community.last),
			is_unread : (updated > community.last)
		};

		if (json[11].length) {
			note.attachment = {};
			var attachment = json[11][0];
			var regex = /http:\/\/(?:.*\.)?youtube.com\/watch\?v=([a-zA-Z0-9_-]+)[-_.!~*'()a-zA-Z0-9;\/?:@&=+\$,%#]*/g;
			if (attachment[24][4] === 'video') {
				if (attachment[24][1].match(regex)) {
					note.attachment.image =
						attachment[24][1].replace(regex, 'http://ytimg.googleusercontent.com/vi/$1/default.jpg');
				}
				else {
					note.attachment.image = attachment[41] && attachment[41][0][1];
				}
				note.attachment.title = attachment[3];
				note.attachment.link  = attachment[24][1];
				if (!attachment[47] || !attachment[47][0] || !(attachment[47][0][1] === 'picasa')) {
					note.attachment.desc  = attachment[21];
				}
			}
			else if ((attachment[24][4] === 'image') || (attachment[24][4] === 'photo')) {
				note.attachment.image = attachment[5] && attachment[5][1] ?
					attachment[5][1] : (attachment[41] && attachment[41][0][1]);
				note.attachment.title = attachment[3];
				note.attachment.link  = attachment[24][1];
				if (!attachment[47] || !attachment[47][0] || !(attachment[47][0][1] === 'picasa')) {
					note.attachment.desc  = attachment[21];
				}
			}
			else if ((attachment[24][4] === 'document') || (attachment[24][3] === 'text/html')) {
				var attachment2 = json[11][1];
				if (attachment2 && ((attachment2[24][4] === 'image') || (attachment2[24][4] === 'photo'))) {
					note.attachment.image = attachment2[5] && attachment2[5][1] ?
						attachment2[5][1] : (attachment2[41] && attachment2[41][0][1]);
					note.attachment.title = attachment[3];
					note.attachment.link  =	(attachment[24][1].substr(0, 4) === 'http' ?
						attachment[24][1] : self.HOME_URL + attachment[24][1]);
					if (!attachment[47] || !attachment[47][0] || !(attachment[47][0][1] === 'picasa')) {
						note.attachment.desc  = attachment[21];
					}
				}
				else if (attachment[21]) {
					note.attachment.title = attachment[3];
					note.attachment.link  = attachment[24][1];
					note.attachment.desc  = attachment[21];
				}
				else if (json[10] == 's:events') {
					note.attachment.title = attachment[3];
					note.attachment.link  = self.HOME_URL + attachment[24][1];
				}
				else {
					note.attachment.title = attachment[3];
					note.attachment.link  = attachment[24][1];
				}
			}
		}
		else if (json[97] && json[97].length) {
			function getAttachment(data) {
				return {
					title : data[10],
					link  : data[5],
					image : data[0][5][0]
				};
			}

			var attachment = json[97][7] || json[97][4] ||  json[97][3] || json[97][2] || json[97][1];
			for (var key in attachment) {
				switch (key) {
				case '27639957':
					note.attachment = getAttachment(attachment[key]);
					break;
				case '27847199':
					note.attachment = getAttachment(attachment[key][3][0]);
					break;
				case '42861421':
				case '40154698':
				case '39748951':
				case '40655821':
				case '40656203':
				case '31748373':
					note.attachment = {
						title : attachment[key][2],
						link  : attachment[key][0],
						image : attachment[key][1],
						desc  : attachment[key][3]
					};
					break;
				case '40842909':
					var attachment2 = attachment[key][41][0][2];
					for (var key2 in attachment2) {
						switch (key2) {
						case '40655821':
							note.attachment = {
								title : attachment[key][2],
								link  : attachment2[key2][0],
								image : attachment2[key2][1],
								desc  : attachment2[key2][3]
							};
							break;
						}
					}
					break;
				case '26807910':
					note.attachment = {
						title : attachment[key][0],
						link  : attachment[key][2],
						image : attachment[key][5],
						desc  : attachment[key][1]
					};
					break;
				case '28286009':
					note.attachment = {
						title : attachment[key][6],
						link  : attachment[key][7],
						image : attachment[key][14]
					};
					break;
				case '27247137':
					note.attachment = {
						title : attachment[key][1],
						link  : attachment[key][0],
						image : attachment[key][4]
					};
				}
			}
		}

		if (json[7].length) {
			var comment = json[7][json[7].length - 1];
			note.comment = {
				text   : comment[2],
				posted : comment[3],
				actor  : {
					id   : comment[6],
					name : comment[1],
					icon : self.getAbsoluteURL(comment[16]) || chrome.extension.getURL('img/p-icon-32.png'),
					url  : self.HOME_URL + comment[10]
				}
			};
		}

		return note;
	},

	setPlusOne : function(item_id, plusone, callback) {
console.log('setPlusOne');
		var self = this;

		$.ajax({
			type     : 'POST',
			url      : self.BASE_URL + self.PLUSONE_URL + '?' +
				$.param({
					hl     : 'en',
					_reqid : self.getReqid(),
					rt     : 'j'
				}),
			data     : {
				itemId : 'buzz:' + item_id,
				set    : (plusone ? 'true' : 'false'),
				at     : self.oz[15]
			},
			success  : function(data) {
				if (typeof callback === 'fucntion') callback();
			}
		});
	},

	SEQUENCE : 0,
	getReqid : function() {
		var sequence = this.SEQUENCE++;
		var now = new Date();
		var seconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
		return seconds + sequence * 1E5;
	},

	getDataByKey : function(arr, key) {
		for (var i = 0, len = arr.length ; i < len ; i++) {
			var data = arr[i];
			if (data[0] === key) {
				return data;
			}
		}
		return null;
	},

	getAbsoluteURL : function(url) {
		if (!url) return url;
		if (url.substr(0, 4) === 'http') {
			return url;
		}
		else if (url.substr(0, 2) === '//') {
			return 'http:' + url;
		}
		else {
			return url;
		}
	},

	getHiddenCommunities : function() {
		var hidden_communities = localStorage.getItem('hidden_communities');
		if (hidden_communities) {
			hidden_communities = JSON.parse(hidden_communities);
		}
		else {
			hidden_communities = [];
		}
		return hidden_communities;
	},

	setHiddenCommunities : function(hidden_communities) {
		var self = this;
		localStorage.setItem('hidden_communities', JSON.stringify(hidden_communities));
		self.updateBadge();
	}
};

var GPCN = new GooglePlusCommunitiesNotifications();

$(function() {
console.log('loading...');
	Sandbox.initailize();
	$('<canvas id="canvas"/>').appendTo(document.body);
	$('<article/>').appendTo('#canvas');
	return GPCN.init();
});

function updateBadgesOnPopup() {
	var popup = chrome.extension.getViews({type: 'popup'})[0];
	if (popup) {
		popup.updateBadges.call(popup);
	}
}

var Sandbox = {
	sandbox  : null,
	sequence : 0,

	initailize : function() {
		this.sandbox = document.createElement('iframe');
		this.sandbox.sandbox = 'allow-scripts';
		this.sandbox.src = 'sandbox.html';
		document.body.appendChild(this.sandbox);
	},

	evalJSON : function(str, callback) {
		var seq = this.sequence++;
		var messageHandler = function(res) {
			if (res.data.seq === seq) {
				window.removeEventListener('message', messageHandler);
				callback(res.data.json);
			}
		};
		window.addEventListener('message', messageHandler, false);
		this.sandbox.contentWindow.postMessage({
			action : 'evalJSON',
			seq    : seq,
			value  : str
		}, '*');
	}
};
