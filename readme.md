#Queueue
Queue with concurency and context for tasks

##Instalation
`npm install queueue`

## Usage
```js
var Q = require("queueue");
//creating queueue instance with concurrency 4
var q = new Q(4);

//when queue is empty and all tasks done print "Done"
q.on("drain", function() {
    console.log("Done");
});

var log(task, name, cb) {
    console.log(task, name);
    cb();
}

//pushing task and run it
q.push({
    ctx: this,
    method: "log",
    args: ["some", "task"];
});

```

### Constructor
```js
    new Q(concurrency) // 'auto' or undefined is equals to cpus number
```

### Tasks
* ctx — context to run task in
* method — method or method name to run
* args — arguments for task's method, last argument is always callback

**All tasks must run callback when finished**


### Methods
####push(task);
adds task or array of tasks to end of the queue

####unshift(task);
adds task or array of tasks to beginnig of the queue

####bind(ctx, [method]);
bind default ctx and/or method for all tasks with no ctx and/or method defined

####length();
returns queue length

####running();
returns number of current workers

### Events
Queueue is event emmitter

####drain
emited when all tasks are done

####empty
emited when queue is empty

####saturate
emited when number of workers is exceeded

####task
emited before task will run

####task
emited when every task is done

####error
emited when task returns error as first argument to callback function

License: MIT
