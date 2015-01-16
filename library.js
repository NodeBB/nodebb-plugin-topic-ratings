"use strict";

var plugin = {},
	async = module.parent.require('async'),
	db = module.parent.require('./database'),
	socketTopics = module.parent.require('./socket.io/topics'),

	settings;

plugin.init = function(params, callback) {
	var app = params.router,
		middleware = params.middleware,
		controllers = params.controllers;

	app.get('/admin/plugins/topicratings', middleware.admin.buildHeader, renderAdmin);
	app.get('/api/admin/plugins/topicratings', renderAdmin);

	callback();
};

function renderAdmin(req, res, next) {
	res.render('admin/plugins/topicratings', {});
}

plugin.addAdminNavigation = function(header, callback) {
	header.plugins.push({
		route: '/plugins/topicratings',
		icon: 'fa-star',
		name: 'ratings'
	});

	callback(null, header);
};

plugin.getTopic = function(data, callback) {
	data.topic.rating = parseInt(data.topic.rating, 10) || 1;
	db.sortedSetScore('tid:' + data.topic.tid + ':ratings', data.uid, function(err, userRating) {
		if (err) {
			return callback(err);
		}
		data.topic.userRating = parseInt(userRating, 10) || 1;
		callback(null, data);
	});
};

socketTopics.rateTopic = function(socket, data, callback) {
	if (!socket.uid) {
		return callback(new Error('[[error:invalid-uid]]'));
	}

	if (!parseInt(data.rating, 10) || !parseInt(data.tid, 10)) {
		return callback(new Error('[[error:invalid-data]]'));
	}
	data.rating = parseInt(data.rating, 10);
	if ([1,2,3,4,5].indexOf(data.rating) === -1) {
		return callback(new Error('[[error:invalid-rating]]'));
	}

	db.sortedSetAdd('tid:' + data.tid + ':ratings', data.rating, socket.uid, function(err) {
		if (err) {
			return callback(err);
		}
		updateTopicRating(data.tid, callback);
	});
};

function updateTopicRating(tid, callback) {
	db.getSortedSetRangeWithScores('tid:' + tid + ':ratings', 0, -1, function(err, data) {
		if (err) {
			return callback(err);
		}

		var totalRating = 0;
		var validScores = 0;
		data.forEach(function(item) {
			var score = parseInt(item.score, 10);
			if (score) {
				totalRating += score;
				validScores++;
			}
		});
		var rating = totalRating / validScores;
		db.setObjectField('topic:' + tid, 'rating', rating, callback);
	});
}


module.exports = plugin;