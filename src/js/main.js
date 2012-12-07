function GooglePlusCommunitiesNotifications() {
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
	COMMUS_URL  : '_/communities/gethome',
	LANDING_URL : '_/communities/landing',

	init : function(callback) {
		var self = this;

		self.communities = [];
		self.total = 0;

		if (self.timer) {
			clearTimeout(self.timer);
			self.timer = null;
		}

		var $article = $('article').empty();

		if (!self.oz || callback) {
			self.getInitData(1, function(data) {
				self.oz = data;
				self.setCommunities($article, callback);
			});
		}
		else {
			self.setCommunities($article, callback);
		}
	},

	setCommunities : function($article, callback) {
		var self = this;

		self.getCommunities(function(communities) {
			$ul = $('ul.infinite-tabs', $article);
			if (!$ul.length) {
				$ul = $('<ul/>', {
					class : 'infinite-tabs'
				});
				$article.append($ul);
			}

			communities.forEach(function(community) {
				var $li = $('<li/>', {
					id    : 'community_' + community.id,
					class : 'community',
					title : self.BASE_URL + 'communities/' + community.id
				});

				$li.appendTo($ul);

				var $a = $('<a/>', {
					href  : '#tab_' + community.id,
					title : community.name
				}).appendTo($li);

				$('<img/>', {
					src : self.getAbsoluteURL(community.icon),
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
		self.communities.forEach(function(community) {
			total += community.unread;
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
			url      : self.BASE_URL + self.COMMUS_URL
				+ '?' + $.param({
					hl     : 'en',
					_reqid : self.getReqid(),
					rt     : 'j'
			}),
			dataType : 'text',
			data     : {
				at : self.oz[15]
			},
			success  : function(data) {
				var text = data.substr(5).replace(/(\\n|\n)/g, '');
				Sandbox.evalJSON(text, function(json) {
					var data = self.getDataByKey(json[0], 'sq.gshr');
					if (data) {
						data[1][0].forEach(function(community) {
							communities.push({
								id     : community[0][0],
								name   : community[0][1][0],
								icon   : community[0][1][3],
								desc   : community[0][1][8],
								unread : community[4][1],
								latest : community[4][2],
								last   : community[4][3]
							});
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
			url      : self.BASE_URL + self.INIT_URL
				+ '?' + $.param({
					hl     : 'en',
					_reqid : self.getReqid(),
					rt     : 'j'
				}),
			dataType : 'text',
			data     : {
				key : key,
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

		$.ajax({
			type     : 'POST',
			url      : self.BASE_URL + self.LANDING_URL
				+ '?' + $.param({
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
					}
					callback(notes);
				});
			}
		});
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

	markAllAsRead : function(page_id, callback) {
console.log('markAllAsRead');
		var self = this;

		var page = self.getPageDataById(page_id);
		if (!page || !page.oz) return callback(0);

		var url = page.page ? 'b/' + page_id + '/' : '';
		$.ajax({
			type     : 'POST',
			url      : self.BASE_URL + url + self.ALREAD_URL
				+ '?' + $.param({
					hl     : 'en',
					_reqid : self.getReqid(),
					rt     : 'j'
				}),
			dataType : 'text',
			data     : {
				'f.req' : '[' + (1000 * new Date) + ']',
				at      : page.oz[15]
			},
			success  : function(data) {
				self.getUnreadCount(page_id, function(unread) {
					page.unread = unread;
					self.updateBadge();
					callback(self.total);
				});
			}
		});
	},

	getOneNotificationData : function(community_id, json) {
console.log('getOneNotificationData');
		var self = this;

		var community = self.getCommunityDataById(community_id);
		if (!community) return null;

		var note = {
			id      : json[8],
			url     : self.BASE_URL + json[21],
			text    : json[47] || json[20],
			time    : json[5], // item[30]/1000
			actor   : {
				id   : json[16],
				name : json[3],
				icon : self.getAbsoluteURL(json[18]),
				url  : self.BASE_URL + json[24],
			},
			is_new  : (json[30] > community.last)
		};

		if (json[11].length) {
			note.attachment = {};
			var attachment = json[11][0];
			if (attachment[24][4] === 'video') {
				note.attachment.image =
					attachment[24][1].replace(
						/http:\/\/(?:.*\.)?youtube.com\/watch\?v=([a-zA-Z0-9_-]+)[-_.!~*'()a-zA-Z0-9;\/?:@&=+\$,%#]*/g,
						'http://ytimg.googleusercontent.com/vi/$1/default.jpg'
					);
				note.attachment.title = attachment[3];
				note.attachment.link  = attachment[24][1];
				note.attachment.desc  = attachment[21];
			}
			else if ((attachment[24][4] === 'image')
				|| (attachment[24][4] === 'photo')) {
				note.attachment.image = attachment[5] && attachment[5][1];
				note.attachment.title = attachment[3];
				note.attachment.link  = attachment[24][1];
//					note.attachment.desc  = attachment[21];
			}
			else if ((attachment[24][4] === 'document')
				|| (attachment[24][3] === 'text/html')) {
				var attachment2 = json[11][1];
				if (attachment2 && ((attachment2[24][4] === 'image')
					|| (attachment2[24][4] === 'photo'))) {
					note.attachment.image = attachment2[5] && attachment2[5][1];
					note.attachment.title = attachment[3];
					note.attachment.link  = attachment[24][1];
//					note.attachment.desc  = attachment[21];
				}
				else if (attachment[21]) {
					note.attachment.title = attachment[3];
					note.attachment.link  = attachment[24][1];
					note.attachment.desc  = attachment[21];
				}
				else if (item[10] == 's:events') {
					note.attachment.title = attachment[3];
					note.attachment.link  = self.BASE_URL + attachment[24][1];
				}
				else {
					note.attachment.title = attachment[3];
					note.attachment.link  = attachment[24][1];
				}
			}
		}

		return note;
	},

	SEQUENCE : 0,
	getReqid : function() {
		var sequence = this.SEQUENCE++;
		var now = new Date;
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
		if (url.substr(0, 4) === 'http') {
			return url;
		}
		else if (url.substr(0, 2) === '//') {
			return 'http:' + url;
		}
		else {
			return url;
		}
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
