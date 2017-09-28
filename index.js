'use strict';
const os = require('os');
const EventEmitter = require('events').EventEmitter;
const inherits = require('util').inherits;

const queueManager = function(position, tasks, cb) {
  if (!Array.isArray(tasks)) {
    tasks = [ tasks ];
  }

  tasks.forEach(data => {
    if (!data.ctx && this.ctx) {
      data.ctx = this.ctx;
    }

    if (!data.method && this.method) {
      data.method = this.method;
    }

    const task = {
      data: data,
      cb: typeof cb === 'function' ? cb : null
    };

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
  const data = task.data;

  if (this.tasks.length === 0) {
    this.emit('empty');
  }

  this.workers++;

  if (!data.args) {
    data.args = [];
  }

  data.args.push( (...args) => {
    this.workers--;

    if (args[0]) {
      this.emit('error', args[0]);
    }

    args.unshift('done');
    this.emit.apply(this, args);

    if (this.tasks.length + this.workers === 0) {
      this.emit('drain');
    }

    this.run();
  });

  this.emit('task', data);
  if (typeof data.method === 'string') {
    data.ctx[data.method].apply(data.ctx, data.args);
  } else {
    data.method.apply(data.ctx, data.args);
  }
};

Q.prototype.push = function(tasks, cb) {
  queueManager.call(this, true, tasks, cb);
  return this;
};

Q.prototype.unshift = function(tasks, cb) {
  queueManager.call(this, false, tasks, cb);
  return this;
};

Q.prototype.length = function() {
  return this.tasks.length;
};

Q.prototype.running = function() {
  return this.workers;
};


module.exports = Q;
