'use strict';

const db = require.main.require('./src/database');
const plugins = require.main.require('./src/plugins');
const socketTopics = require.main.require('./src/socket.io/topics');

const plugin = module.exports;

const validRatings = [1, 2, 3, 4, 5];

plugin.init = async function (params) {
	const { router } = params;
	const routeHelpers = require.main.require('./src/routes/helpers');
	routeHelpers.setupAdminPageRoute(router, '/admin/plugins/topic-ratings', (req, res) => {
		res.render('admin/plugins/topic-ratings', {});
	});
};

plugin.addAdminNavigation = function (header) {
	header.plugins.push({
		route: '/plugins/topic-ratings',
		icon: 'fa-star',
		name: 'Topic Ratings',
	});

	return header;
};

plugin.filterTopicGet = async function (hookData) {
	if (!hookData || !hookData.topic) {
		return hookData;
	}
	await setRatingData([hookData.topic], hookData.uid);
	return hookData;
};

plugin.filterTopicsGet = async function (hookData) {
	if (!hookData || !Array.isArray(hookData.topics)) {
		return hookData;
	}

	await setRatingData(hookData.topics, hookData.uid);
	return hookData;
};

async function setRatingData(topics, uid) {
	topics.forEach((topic) => {
		if (topic) {
			topic.rating = parseFloat(topic.rating, 10) || 0;
			topic.ratings = generateRatings(topic.rating);
			topic.numRatings = parseInt(topic.numRatings, 10) || 0;
		}
	});

	const keys = topics.map(t => `tid:${t.tid}:ratings`);
	const userRatings = await db.sortedSetsScore(keys, uid);
	userRatings.forEach((userRating, index) => {
		if (topics[index]) {
			topics[index].userRating = parseInt(userRating, 10) || 0;
		}
	});
}

function generateRatings(topicRating) {
	function getIcon(rating) {
		if (topicRating >= rating - 0.25) {
			return 'fa-star';
		} else if (topicRating >= rating - 0.75 && topicRating <= rating - 0.25) {
			return 'fa-star-half-o';
		}
		return 'fa-star-o';
	}
	return validRatings.map(rating => ({
		value: rating,
		icon: getIcon(rating),
	}));
}

plugin.actionTopicSave = async function (data) {
	await updateTopicRating(data.topic.tid);
};

socketTopics.rateTopic = async function (socket, data) {
	if (!socket.uid) {
		throw new Error('[[error:not-logged-in]]');
	}

	if (!parseInt(data.rating, 10) || !parseInt(data.tid, 10)) {
		throw new Error('[[error:invalid-data]]');
	}
	data.rating = parseInt(data.rating, 10);
	if (!validRatings.includes(data.rating)) {
		throw new Error('[[error:invalid-rating]]');
	}

	await db.sortedSetAdd(`tid:${data.tid}:ratings`, data.rating, socket.uid);
	const newRatingData = await updateTopicRating(data.tid);
	plugins.hooks.fire('action:topic.rate', {
		uid: socket.uid,
		tid: parseInt(data.tid, 10),
		rating: data.rating,
	});
	return {
		rating: newRatingData.newRating,
		ratings: generateRatings(newRatingData.newRating),
		numRatings: newRatingData.numRatings,
	};
};

async function updateTopicRating(tid) {
	const data = await db.getSortedSetRangeWithScores(`tid:${tid}:ratings`, 0, -1);

	let totalRating = 0;
	let validScores = 0;
	data.forEach((item) => {
		const score = parseInt(item.score, 10);
		if (score) {
			totalRating += score;
			validScores += 1;
		}
	});
	let rating = 0;
	if (validScores > 0) {
		rating = totalRating / validScores;
	}
	const cid = await db.getObjectField(`topic:${tid}`, 'cid');
	await db.setObject(`topic:${tid}`, {
		rating: rating,
		numRatings: data.length,
	});

	if (cid) {
		await db.sortedSetAdd(`cid:${cid}:tids:rating`, rating, tid);
	}
	return {
		newRating: rating,
		numRatings: data.length,
	};
}

plugin.actionTopicMove = async (hookData) => {
	if (hookData.fromCid) {
		await db.sortedSetRemove(`cid:${hookData.fromCid}:tids:rating`, hookData.tid);
	}
	if (hookData.toCid) {
		const rating = await db.getObjectField(`topic:${hookData.tid}`, 'rating');
		if (rating > 0) {
			await db.sortedSetAdd(`cid:${hookData.toCid}:tids:rating`, hookData.tid);
		}
	}
};
