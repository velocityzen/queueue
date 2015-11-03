'use strict';
let os = require('os');
let EventEmitter = require('events').EventEmitter;
let inherits = require('util').inherits;

let slice = Array.prototype.slice;

let queueManager = function(position, tasks, cb) {
  let self = this;

  if (!Array.isArray(tasks)) {
    tasks = [ tasks ];
  }

  tasks.forEach(function(data) {
    if (!data.ctx && self.ctx) {
      data.ctx = self.ctx;
    }

    if (!data.method && self.method) {
      data.method = self.method;
    }

    let task = {
      data: data,
      cb: typeof cb === 'function' ? cb : null
    };

    if (position) {
      self.tasks.push(task);
      self.progress.push(data);
    } else {
      self.tasks.unshift(task);
      self.progress.unshift(data);
    }

    if (self.tasks.length === self.concurrency) {
      self.emit('saturate');
    }

    process.nextTick(function() {
      self.run();
    });
  });
};

let Q = function(concurrency) {
  EventEmitter.call(this);

  this.concurrency = concurrency === 'auto' || concurrency === undefined ? os.cpus().length : concurrency;
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
    let self = this;
    let task = this.tasks.shift();
    let data = task.data;

    if (this.tasks.length === 0) {
      this.emit('empty');
    }

    this.workers++;

    if (!data.args) {
      data.args = [];
    }

    data.args.push(function(err) {
      self.workers--;
      self.progress.splice(self.progress.indexOf(task.data), 1);

      err && self.emit('error', err);

      let args = slice.call(arguments);
      args.unshift('done');
      self.emit.apply(self, args);

      if (self.tasks.length + self.workers === 0) {
        self.emit('drain');
      }
      self.run();
    });

    this.emit('task', data);
    if (typeof data.method === 'string') {
      data.ctx[data.method].apply(data.ctx, data.args);
    } else {
      data.method.apply(data.ctx, data.args);
    }
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
