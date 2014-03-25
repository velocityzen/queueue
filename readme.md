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

### methods
####push(task);
adds task or array of tasks to end of the queue

####unshift(task);
adds task or array of tasks to beginnig of the queue

####bind(ctx);
bind default ctx for all tasks with no ctx defined

####length();
returns queue length

####running();
returns number of current workers

### tasks
* ctx — context to run task in
* method — method or method name to run
* args — arguments for task's method, last argument is always callback

**All tasks must run cb when finished**

### events
Queueue is event emmitter

####drain
emmited when all tasks are done

####empty
emmited when queue is empty

####saturate
emmited when number of workers is exceeded

####task
emmited before task will run

License: MIT
