
'use strict';

/* globals app, socket, ajaxify */

$(document).ready(function() {

	$(window).on('action:ajaxify.end', initTopicRatings);

	$(window).on('action:topics.loaded', initTopicRatings);

	function initTopicRatings(ev, data) {
		if (app.template === 'topic' || app.template === 'category') {
			var component = $('[component="topic/ratings"]');
			if (!component.length) {
				return;
			}

			component.each(function() {
				updateRating($(this), $(this).attr('data-user-rating'));
			});


			component.find('.fa').hover(handlerIn);
			component.on('mouseleave', handlerOut);
			component.find('a').on('click', rateTopic);
		}
	}

	function updateRating(component, rating) {
		component.children().each(function(index) {
			var icon = $(this).find('i');

			icon.toggleClass('fa-star', index + 1 <= rating);
			icon.toggleClass('fa-star-o', index + 1 > rating);
		});
	}

	function handlerIn() {
		var component = $(this).parents('[component="topic/ratings"]');
		updateRating(component, parseInt($(this).attr('data-rating'), 10));
	}

	function handlerOut() {
		updateRating($(this), $(this).attr('data-user-rating'));
	}

	function rateTopic() {
		var rating = $(this).find('i').attr('data-rating');
		var component = $(this).parents('[component="topic/ratings"]');

		socket.emit('topics.rateTopic', {tid: component.attr('data-tid'), rating: rating}, function(err) {
			if (err) {
				return app.alertError(err.message);
			}

			component.attr('data-user-rating', rating);
			updateRating(component, rating);
		});
		return false;
	}
});