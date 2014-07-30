"use strict";
var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;

var queueManager = function(position, data, cb) {
	var self = this;

	if(!Array.isArray(data)) {
		data = [data];
	}

	data.forEach(function(data) {
		if(!data.ctx && self.ctx) {
			data.ctx = self.ctx;
		}

		if(!data.method && self.method) {
			data.method = self.method;
		}

		var task = {
			data: data,
            cb: typeof cb === 'function' ? cb : null
		};

		if(position) {
			if(self.tasks.indexOf(task) === -1) {
				self.tasks.push(task);
				self.progress.push(data);
			}
		} else {
			self.tasks.unshift(task);
			self.progress.unshift(data);
		}

		if(self.tasks.length === self.concurrency) {
			self.emit('saturate');
		}

		process.nextTick(function(){
			self.run();
		});
	});
};

var Q = function(concurrency) {
	EventEmitter.call(this);

	this.concurrency = concurrency || 1;
	this.tasks = [];
	this.progress = [];
	this.workers = 0;
};
inherits(Q, EventEmitter);

Q.prototype.bind = function(ctx, method) {
	this.ctx = ctx;
	this.method = method;
	return this;
};

Q.prototype.run = function() {
	if (this.workers < this.concurrency && this.tasks.length) {
		var self = this,
			task = this.tasks.shift(),
			data = task.data;

		if (this.tasks.length === 0) {
			this.emit('empty');
		}

		this.workers++;

		if(!data.args) {
			data.args = [];
		}

		data.args.push(function() {
			self.workers--;
			task.callback && task.callback.apply(task, arguments);
			self.progress.splice(self.progress.indexOf(task.data), 1);

			if (self.tasks.length + self.workers === 0) {
				self.emit('drain');
			}
			self.run();
		});

		this.emit("task", data);
		if(typeof data.method === "string") {
			data.ctx[data.method].apply(data.ctx, data.args);
		} else {
			data.method.apply(data.ctx, data.args);
		}
	}
};

Q.prototype.push = function(data, cb) {
	queueManager.call(this, true, data, cb);
	return this;
};

Q.prototype.unshift = function(data, cb) {
	queueManager.call(this, false, data, cb);
	return this;
};

Q.prototype.length = function() {
	return this.tasks.length;
};

Q.prototype.running = function() {
	return this.workers;
};


module.exports = Q;
