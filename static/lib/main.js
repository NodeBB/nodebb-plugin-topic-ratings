
'use strict';

/* globals app, socket, ajaxify */

$(document).ready(function() {

	var myRating;

	$(window).on('action:ajaxify.end', function(ev, data) {
		if (data.tpl_url === 'topic') {
			myRating = $('.topic-ratings-stars').attr('data-user-rating');
			updateRating(myRating);

			$('.topic-ratings-stars .fa').hover(handlerIn);
			$('.topic-ratings-stars').on('mouseleave', handlerOut);
			$('.topic-ratings-stars a').on('click', rateTopic);
		}
	});

	function updateRating(rating) {
		$('.topic-ratings-stars').each(function() {
			$(this).children().each(function(index) {
				var icon = $(this).find('i');

				icon.toggleClass('fa-star', index + 1 <= rating);
				icon.toggleClass('fa-star-o', index + 1 > rating);
			});
		});
	}

	function handlerIn() {
		updateRating(parseInt($(this).attr('data-rating'), 10));
	}

	function handlerOut() {
		updateRating(myRating);
	}

	function rateTopic() {
		var rating = $(this).find('i').attr('data-rating');

		socket.emit('topics.rateTopic', {tid: ajaxify.variables.get('topic_id'), rating: rating}, function(err) {
			if (err) {
				return app.alertError(err.message);
			}

			myRating = rating;
		});
		return false;
	}
});