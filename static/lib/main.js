
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
				if (index + 1 <= rating) {
					icon.addClass('fa-star').removeClass('fa-star-o');
				} else {
					icon.addClass('fa-star-o').removeClass('fa-star');
				}
			});
		});
	}

	function handlerIn(ev) {
		updateRating(parseInt($(this).attr('data-rating'), 10));
	}

	function resetAll() {
		$('.topic-ratings-stars').children().each(function(index, el) {
			$(this).addClass('fa-star-o').removeClass('fa-star');
		});
	}

	function handlerOut(ev) {
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