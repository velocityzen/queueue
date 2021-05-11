"use strict";
const os = require("os");
const EventEmitter = require("events").EventEmitter;
const inherits = require("util").inherits;

const queueManager = function (position, tasks) {
  if (!Array.isArray(tasks)) {
    tasks = [tasks];
  }

  tasks.forEach((task) => {
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
      this.emit("saturate");
    }

    process.nextTick(() => this.run());
  });
};

class Q extends EventEmitter {
  constructor(concurrency) {
    super();

    this.concurrency =
      concurrency === "auto" || concurrency === undefined
        ? os.cpus().length
        : concurrency;
    this.tasks = [];
    this.workers = 0;
  }

  bind(ctx, method) {
    if (typeof ctx === "function") {
      method = ctx;
      ctx = undefined;
    }

    this.ctx = ctx;
    this.method = method;
    return this;
  }

  run() {
    if (!(this.tasks.length && this.workers < this.concurrency)) {
      return;
    }

    const task = this.tasks.shift();

    if (this.tasks.length === 0) {
      this.emit("empty");
    }

    this.workers++;
    const args = task.args ? task.args.slice() : [];
    args.push((...args) => this.didRun(...args));
    this.emit("task", task);
    const call =
      typeof task.method === "string" ? task.ctx[task.method] : task.method;
    try {
      const promise = call.apply(task.ctx, args);
      if (promise) {
        promise
          .then((res) => this.didRun(null, res))
          .catch((err) => this.didRun(err));
      }
    } catch (err) {
      this.didRun(err);
    }
  }

  didRun(err, ...args) {
    this.workers--;

    if (err) {
      this.emit("error", err);
    } else {
      args.unshift("done");
      this.emit.apply(this, args);
    }

    if (this.tasks.length + this.workers === 0) {
      this.emit("drain");
    }

    this.run();
    return null;
  }

  push(tasks) {
    queueManager.call(this, true, tasks);
    return this;
  }

  unshift(tasks) {
    queueManager.call(this, false, tasks);
    return this;
  }

  length() {
    return this.workers + this.tasks.length;
  }

  running() {
    return this.workers;
  }

  abort() {
    this.tasks = [];
  }
}

module.exports = Q;
