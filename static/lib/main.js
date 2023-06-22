
'use strict';

$(document).ready(function () {
	$(window).on('action:topic.loaded', initTopicRatings);
	$(window).on('action:topics.loaded', initTopicRatings);

	function initTopicRatings() {
		const tplsToShowOn = ['topic', 'category', 'recent', 'popular', 'top'];
		if (tplsToShowOn.includes(ajaxify.data.template.name)) {
			const component = $('[component="topic/ratings"]');
			if (!component.length) {
				return;
			}

			component.on('mouseenter', '.fa', handlerIn);
			component.on('mouseleave', handlerOut);
			component.on('click', 'a', rateTopic);

			setupTooltips();
		}
	}

	function setupTooltips() {
		const component = $('[component="topic/ratings"]');

		component.tooltip({
			trigger: 'hover',
			html: true,
			animation: false,
			placement: 'top',
			title: function () {
				const $this = $(this);
				const rating = parseFloat($(this).attr('data-topic-rating')).toFixed(2);
				const numRatings = $this.attr('data-num-ratings') || 0;
				return `${rating} (<i class="fa fa-user"></i> ${numRatings})`;
			},
		});

		component.on('click', function () {
			$(this).tooltip('hide');
		});
	}

	function updateRating(component, rating) {
		component.children().each(function (index) {
			var icon = $(this).find('i');
			const savedIcon = icon.attr('data-saved-icon');
			if (!savedIcon) {
				icon.attr('data-saved-icon', icon.attr('class'));
			}
			icon.removeClass('fa-star-half-o');
			icon.toggleClass('fa-star', index + 1 <= rating);
			icon.toggleClass('fa-star-o', index + 1 > rating);
		});
	}

	function handlerIn() {
		const icon = $(this);
		const component = icon.parents('[component="topic/ratings"]');

		component.addClass('text-primary').removeClass('text-warning');
		updateRating(component, parseFloat($(this).attr('data-rating')));
	}

	function handlerOut() {
		const component = $(this);
		component.removeClass('text-primary').addClass('text-warning');
		component.children().each(function () {
			const icon = $(this).find('i');
			const className = icon.attr('data-saved-icon');
			if (className) {
				icon.attr('class', className);
				icon.removeAttr('data-saved-icon');
			}
		});
	}

	async function rateTopic() {
		var rating = $(this).find('i').attr('data-rating');
		var component = $(this).parents('[component="topic/ratings"]');
		const tid = component.attr('data-tid');
		socket.emit('topics.rateTopic', {
			tid: tid,
			rating: rating,
		}, async function (err, result) {
			if (err) {
				require(['alerts'], function (alerts) {
					alerts.error(err.message);
				});
				return;
			}

			component.attr('data-user-rating', rating);
			component.attr('data-topic-rating', result.rating);
			component.attr('data-num-ratings', result.numRatings);
			const html = await app.parseAndTranslate('partials/ratings', { ratings: result.ratings });
			$(`[component="topic/ratings"][data-tid=${tid}]`).html(html.html());
		});
		return false;
	}
});
