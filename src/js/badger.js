// Badger v1.0 by Daniel Raftery
// http://thrivingkings.com/badger
//
// http://twitter.com/ThrivingKings
//
// midified by YungSang to handle mutiple badges
(function($) {
	$.fn.badger = function(badge, callback) {
  	var $badger = this.find('.badger-outter');

		if ($badger.length) {
			this.find('.badger-badge').html(badge);
		}
		else {
			var $badger = $('<div/>', {
				class: 'badger-outter'
			}).appendTo(this);
			$('<div/>', {
				class: 'badger-inner'
			}).appendTo($badger).append(
				$('<p/>', {
					class: 'badger-badge'
				}).html(badge)
			);
		}

		if (badge) {
			$badger.show();
		}
		else {
			$badger.hide();
		}

		// Send back badge
		if (typeof callback == 'function') {
			callback(badge);
		}
	};
})( jQuery );