"use strict";

var plugin = {},
	async = module.parent.require('async'),
	db = module.parent.require('./database'),
	plugins = module.parent.exports,
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
	if (!data || !data.topic) {
		return callback(null, data);
	}
	data.topic.rating = parseInt(data.topic.rating, 10) || 1;
	db.sortedSetScore('tid:' + data.topic.tid + ':ratings', data.uid, function(err, userRating) {
		if (err) {
			return callback(err);
		}
		data.topic.userRating = parseInt(userRating, 10) || 0;
		callback(null, data);
	});
};

plugin.getTopics = function(data, callback) {
	if (!data || !data.topics) {
		return callback(null, data);
	}

	data.topics.forEach(function(topic) {
		if (topic) {
			topic.rating = parseInt(topic.rating, 10) || 1;
		}
	});

	var keys = data.topics.map(function(topic) {
		return 'tid:' + topic.tid + ':ratings';
	});
	db.sortedSetsScore(keys, data.uid, function(err, userRatings) {
		if (err) {
			return callback(err);
		}
		userRatings.forEach(function(userRating, index) {
			if (data.topics[index]) {
				data.topics[index].userRating = parseInt(userRating, 10) || 0;
			}
		});
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
		plugins.fireHook('action:topic.rate', {
			uid: socket.uid,
			tid: parseInt(data.tid, 10),
			rating: data.rating
		});
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
		async.parallel([
			function (next) {
				db.setObjectField('topic:' + tid, 'rating', rating, next);
			},
			function (next) {
				db.getObjectField('topic:' + tid, 'cid', function(err, cid) {
					if (err) {
						return next(err);
					}
					if (cid) {
						db.sortedSetAdd('cid:' + cid + ':tids:rating', rating, tid, next);
					} else {
						next();
					}
				});
			}
		], function(err) {
			callback(err);
		});
	});
}


module.exports = plugin;