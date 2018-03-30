'use strict';
const test = require('ava');
const Q = require('./index');

test.cb('pushes task and checks the result', t => {
  const q = new Q(1).on('drain', () => t.end());
  q.push({
    method: (data, cb) => {
      t.is(data, 'task1');
      cb();
    },
    args: [ 'task1' ]
  });
});

test.cb('pushes task with no arguments and checks the result', t => {
  const q = new Q(1).on('drain', () => t.end());
  q.push({
    method: cb => {
      t.is(typeof cb, 'function');
      cb();
    }
  });
});

test.cb('pushes task that returns promise and checks the result', t => {
  const q = new Q(1).on('drain', () => t.end());
  q.push({
    method: data => new Promise(resolve => {
      t.is(data, 'task1');
      resolve();
    }),
    args: [ 'task1' ]
  });
});

test.cb('checks done event gets the results from usual async task', t => {
  t.plan(3);
  const q = new Q(1)
    .on('drain', () => t.end())
    .on('done', (a, b) => {
      t.is(a, 'a');
      t.is(b, 'b');
    });

  q.push({
    method: (data, cb) => {
      t.is(data, 'task1');
      cb(null, 'a', 'b');
    },
    args: [ 'task1' ]
  });
});

test.cb('checks done event gets the results from promised task', t => {
  t.plan(2);
  const q = new Q(1)
    .on('drain', () => t.end())
    .on('done', test => t.is(test, 'test'))
    .on('error', () => t.fail())

  q.push({
    method: data => new Promise(resolve => {
      t.is(data, 'task1');
      resolve('test');
    }),
    args: [ 'task1' ]
  });
});

test.cb('checks error event', t => {
  t.plan(2);
  const q = new Q(1)
    .on('drain', () => t.end())
    .on('error', err => t.is(err, 'error'));

  q.push({
    method: (data, cb) => {
      t.is(data, 'task1');
      cb('error');
    },

    args: [ 'task1' ]
  })
});

test.cb('checks error event from rejected Promise', t => {
  t.plan(2);
  const q = new Q(1)
    .on('drain', () => t.end())
    .on('error', err => {
      t.is(err, 'error');
    });

  q.push({
    method: data => new Promise((resolve, reject) => {
      t.is(data, 'task1');
      reject('error');
    }),
    args: [ 'task1' ]
  });
});

test.cb('check task event', t => {
  t.plan(5);
  const q = new Q(1)
    .on('drain', () => t.end())
    .on('task', task => {
      t.is(typeof task.method, 'function');
      t.is(task.args[0], 'arg1');
      t.is(task.args[1], 'arg2');
    });

  q.push({
    method: (arg1, arg2, cb) => {
      t.is(arg1, 'arg1');
      t.is(arg2, 'arg2');
      cb();
    },
    args: [ 'arg1', 'arg2' ]
  });
});

test.cb('checks task in context', t => {
  const obj = {
    test: 'test',
    get: function() {
      return this.test;
    }
  }

  const q = new Q(1)
    .on('drain', () => t.end());

  q.push({
    ctx: obj,
    method: function(arg1, cb) {
      t.is(arg1, 'arg1');
      t.is(this.test, 'test');
      cb();
    },
    args: [ 'arg1' ]
  });
});

test.cb('checks method in context', t => {
  t.plan(2);

  const obj = {
    test: 'test',
    get: function(arg1, cb) {
      t.is(this.test, 'test');
      t.is(arg1, 'arg1');
      cb();
    }
  }

  const q = new Q(1)
    .on('drain', () => t.end());

  q.push({
    ctx: obj,
    method: obj.get,
    args: [ 'arg1' ]
  });
});

test.cb('checks method as a name in context', t => {
  t.plan(2);

  const obj = {
    test: 'test',
    get: function(arg1, cb) {
      t.is(this.test, 'test');
      t.is(arg1, 'arg1');
      cb();
    }
  }

  const q = new Q(1)
    .on('drain', () => t.end());

  q.push({
    ctx: obj,
    method: 'get',
    args: [ 'arg1' ]
  });
});

test.cb('binds the context and method', t => {
  t.plan(2);

  const obj = {
    test: 'test',
    get: function(arg1, cb) {
      t.is(this.test, 'test');
      t.is(arg1, 'arg1');
      cb();
    }
  }

  const q = new Q()
    .bind(obj, 'get')
    .on('drain', () => t.end());

  q.push({
    args: [ 'arg1' ]
  });
});

test.cb('checks the concurency', t => {
  t.plan(5);
  let sum = 0;

  const q = new Q(2)
    .on('saturate', () => t.is(sum === 0 || sum === 3, true))
    .on('empty', () => t.is(sum, 7))
    .on('drain', () => t.end());

  const obj = {
    test: 'test',
    get: function(num, cb) {
      sum += num;

      if (sum === 3) {
        t.is(q.length(), 1);
        t.is(q.running(), 1);
        q.unshift({ args: [ 4 ] });
      }
      cb();
    }
  }

  q
    .bind(obj, 'get')
    .push([
      { args: [ 1 ] },
      { args: [ 2 ] },
      { args: [ 3 ] }
    ]);
});

test.cb('aborts the queueue after first result', t => {
  t.plan(1);

  const q = new Q(2)
    .on('error', () => q.abort())
    .on('drain', () => t.end());

  const obj = {
    get: function(num, cb) {
      t.pass();
      cb(new Error());
    }
  }

  q
    .bind(obj, 'get')
    .push([
      { args: [ 1 ] },
      { args: [ 2 ] },
      { args: [ 3 ] }
    ]);
});
