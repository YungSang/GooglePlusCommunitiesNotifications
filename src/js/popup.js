$(window).load(function() {
	var $nav = $('body > header nav');

	var $a = $('<a/>', {
		id    : 'close',
		href  : '#',
		title : 'Close'
	}).click(function() {
		hidePopup();
		return false;
	}).append('X').prependTo($nav);

	var $a = $('<a/>', {
		id    : 'reload',
		href  : '#',
		title : 'Reload'
	}).click(function() {
		$('#loading').show();
		bg.GPCN.init(function() {
			setTimeout(function() {
				loadCommunities();
			}, 500);
		});
		return false;
	});
	$('<img/>', {
		src : chrome.extension.getURL('img/reload-16.png'),
		alt : ''
	}).appendTo($a);
	$a.append(' Reload').appendTo($nav);
});

$('article header').live('click' ,function(event) {
	$('article > ul').animate({scrollTop: 0}, 100);
});

$('article a').live('click' ,function(event) {
	event.preventDefault();
	event.stopPropagation();
	openWindowInBackground($(this).attr('href'));
	return false;
});

$('article li.notification').live('click' ,function(event) {
	openWindowInBackground($(this).attr('data-url'));
});

function setInfiniteTab() {
	var $tabs = $("nav ul.infinite-tabs");

	var $article = $('article');

	if (!$('li', $tabs).length) {
		$('ul', $article).remove();
		$('header h3 a', $article).empty();
		$('header > a', $article).remove();
		var msg = chrome.i18n.getMessage('no_communities');
		$('<ul/>').appendTo($article).append('<li>' + msg + '</li>');
	}

	$tabs.infiniteTabs().find('li').click(function(e) {
		$('#loading').show();

		e.preventDefault();
		e.stopPropagation();
		$(this).parents('ul.infinite-tabs').find('li').removeClass("active");
		$(this).addClass("active");

		// code goes here to react to tab change
		$('h3 a', $article)
			.attr({
				href  : $(this).attr('data-url'),
				title : $(this).attr('data-url')
			})
			.empty().append($('a', this).attr('title'));

		$('ul', $article).remove();
		$('header > a', $article).remove();

		var community_id = $(this).attr('data-id');
		localStorage.setItem('last_community', community_id);

		bg.GPCN.getNotifications(community_id, function(notes) {
			if (!notes.length) {
				var msg = chrome.i18n.getMessage('no_notifications');
				$('<ul/>').appendTo($article).append('<li>' + msg + '</li>');
				$('#loading').hide();
				return;
			}

			var msg = 'Clear Marks Now'; // chrome.i18n.getMessage('mark_all_as_read');
			var $a = $('<a/>', {
				href  : '#markallasread',
				title : msg
			}).click(function() {
				bg.GPCN.markAllAsRead(community_id, function() {
					$('.unread').removeClass('unread');
					$('.new').removeClass('new');
				});
				return false;
			}).append(msg).prependTo($('header', $article));

			var $ul = $('<ul/>').appendTo($article);

			notes.forEach(function(note) {
				addNotificationToList(note, $ul);
			});

			$('#loading').hide();
		});
	});

	updateBadges();

	var community_id = localStorage.getItem('last_community');
	if (community_id) {
		var $community = $('#community_' + community_id);
		if ($community.length) {
			var $first = $('li.scroller li:first', $tabs);
			if ($community.attr('id') !== $first.attr('id')) {
				$tabs.infiniteTabs('prepend-tab', $community);
			}
			$community.click();
		}
		else {
			$('#loading').hide();
		}
	}
	else {
		$('#loading').hide();
	}

	$tabs.infiniteTabs( 'adjust-to-fit' );
}

function updateBadges() {
	bg.GPCN.communities.forEach(function(community) {
		$('#community_' + community.id).badger(community.unread || '');
	});
	$('#total').empty().append(bg.GPCN.total ? '(' + bg.GPCN.total + ')' : '');
}

function loadCommunities() {
	var $ul = $("nav ul.infinite-tabs").empty();
	var hidden_communities = bg.GPCN.getHiddenCommunities();
	bg.$('article ul li').each(function() {
		var id = $(this).attr('data-id');
		if ($.inArray(id, hidden_communities) == -1) {
			$ul.append($(this).clone());
		}
	});
	setTimeout(setInfiniteTab, 100);
}

function addNotificationToList(note, $ul) {
	var $li = $('<li/>', {
		class      : 'notification',
		'data-url' : note.url
	}).appendTo($ul);
	if (note.id) {
		$li.attr('id', 'note_' + note.id);
	}

	if (note.is_unread) {
		$li.addClass('unread');
	}
	if (note.is_new) {
		$li.addClass('new');
	}

	var $div = $('<div/>', {
		class     : 'plusone',
		'data-id' :  note.id
	}).append('<div/>')
	.click(function(event) {
		event.preventDefault();
		event.stopPropagation();

		var $this = $(this);
		var id = $this.attr('data-id');

		if ($this.hasClass('on')) {
			$this.removeClass('on');
			bg.GPCN.setPlusOne(id, false);
		}
		else {
			$this.addClass('on');
			bg.GPCN.setPlusOne(id, true);
		}

		return false;
	})
	.appendTo($li);

	if (note.is_plused) {
		$div.addClass('on');
	}

	$('<img/>', {
		src : note.actor.icon
	}).appendTo($li);

	var time = new Date(note.updated);
	$('<a/>', {
		href  : note.url,
		title : note.url
	}).addClass('datetime').append(time.toString()).appendTo($li).wrap('<div/>');

	$('<a/>', {
		href  : note.actor.url,
		title : note.actor.url
	}).addClass('actor').append(note.actor.name).appendTo($li).wrap('<div/>');

	$('<a/>', {
		href  : note.stream.url,
		title : note.stream.url
	}).addClass('stream').append(note.stream.name).appendTo($li);

	var status = [];
	if (note.plusones) {
		status.push('+' + note.plusones);
	}
	if (note.reshares) {
		status.push('<div class="reshare"></div>' + note.reshares);
	}
	if (note.replies) {
		status.push('<div class="replies"></div>' + note.replies);
	}
	$('<div class="status"/>').html(status.join('&nbsp;&nbsp;')).appendTo($li);

	var annotation = truncateText(note.text, 140);
	if (note.attachment) {
		if (annotation) annotation += '<br/>\n';
		if (note.attachment.link && note.attachment.title) {
			annotation += '<a href="' + note.attachment.link + '">' + note.attachment.title + '</a><br/>\n';
		}
		if (note.attachment.image) {
			annotation += '<img class="photo" src="http://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?url=' + encodeURIComponent(note.attachment.image) + '&container=focus&gadget=a&rewriteMime=image/*&refresh=31536000&resize_h=250&resize_w=250&no_expand=1"/>\n';
		}
		if (note.attachment.desc) {
			var desc = truncateText(note.attachment.desc, 140);
			annotation += '<div class="desc">' + desc + '</div>\n';
		}
	}
	if (annotation) {
		$('<hr/>').appendTo($li);
	}

	$('<div/>').addClass('annotation').html(annotation).appendTo($li);

	if (note.comment) {
		$('<hr/>').appendTo($li);

		var $comment = $('<div/>').addClass('comment').appendTo($li);

		$('<img/>', {
			src : note.comment.actor.icon
		}).appendTo($comment);

		$('<div/>').addClass('actor').append(note.comment.actor.name).appendTo($comment);

		var comment = truncateText(note.comment.text, 140);
		$comment.append(comment);
	}

	$('<div/>').addClass('clear').appendTo($li);
}

function truncateText(text, length) {
	text = text.replace(/(<br\s*\/?>)+/g, ' ');
	text = text.replace(/<a[^>]*>/g, '');
	text = text.replace(/<\/a>/g, '');
	text = text.replace(/<span[^>]*>/g, '');
	text = text.replace(/<\/span>/g, '');
	return (text.length > length) ? text.substr(0, length - 3) + '...' : text;
}

var bg = chrome.extension.getBackgroundPage();

function openWindowInBackground(url) {
	chrome.tabs.create({
		url      : url,
		selected : false
	});
}

function hidePopup() {
//	bg.GPCN.init(function() {});
	window.close();
}

$(function() {
	$('.need2translate').each(function() {
		$this = $(this);
		var translated = $this.html().replace(/__MSG_(.+)__/g, function (m, key) {
			return chrome.i18n.getMessage(key);
		});
		$this.html(translated);
	});

	loadCommunities();
});

$(window).unload(function() {
	bg.GPCN.init(function() {});
});