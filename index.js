'use strict';
const os = require('os');
const EventEmitter = require('events').EventEmitter;
const inherits = require('util').inherits;

const queueManager = function(position, tasks) {
  if (!Array.isArray(tasks)) {
    tasks = [ tasks ];
  }

  tasks.forEach(task => {
    if (!task.ctx && this.ctx) {
      task.ctx = this.ctx;
    }

    if (!task.method && this.method) {
      task.method = this.method;
    }

    if (position) {
      this.tasks.push(task);
    } else {
      this.tasks.unshift(task);
    }

    if (this.tasks.length === this.concurrency) {
      this.emit('saturate');
    }

    process.nextTick(() => this.run());
  });
};

const Q = function(concurrency) {
  EventEmitter.call(this);

  this.concurrency = concurrency === 'auto' || concurrency === undefined ? os.cpus().length : concurrency;
  this.tasks = [];
  this.workers = 0;
};
inherits(Q, EventEmitter);

Q.prototype.bind = function(ctx, method) {
  this.ctx = ctx;
  this.method = method;
  return this;
};

Q.prototype.run = function() {
  if (!(this.tasks.length && this.workers < this.concurrency)) {
    return;
  }

  const task = this.tasks.shift();

  if (this.tasks.length === 0) {
    this.emit('empty');
  }

  this.workers++;
  const args = task.args ? task.args.slice() : [];
  args.push((...args) => this.didRun(...args));
  this.emit('task', task);
  const call = typeof task.method === 'string' ? task.ctx[task.method] : task.method;
  try {
    const promise = call.apply(task.ctx, args);
    if (promise) {
      promise
        .then(res => this.didRun(null, res))
        .catch(err => this.didRun(err));
    }
  } catch (err) {
    this.didRun(err);
  }
};

Q.prototype.didRun = function(err, ...args) {
  this.workers--;

  if (err) {
    this.emit('error', err);
  } else {
    args.unshift('done');
    this.emit.apply(this, args);
  }

  if (this.tasks.length + this.workers === 0) {
    this.emit('drain');
  }

  this.run();
  return null;
};

Q.prototype.push = function(tasks) {
  queueManager.call(this, true, tasks);
  return this;
};

Q.prototype.unshift = function(tasks) {
  queueManager.call(this, false, tasks);
  return this;
};

Q.prototype.length = function() {
  return this.tasks.length;
};

Q.prototype.running = function() {
  return this.workers;
};

Q.prototype.abort = function() {
  this.tasks = [];
};


module.exports = Q;
