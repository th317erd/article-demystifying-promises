# Demystifying Promises

Asynchronous code can be confusing sometimes. Most people understand a callback: "Call me when you are done". Simple. But what about Promises? Though Promises make our lives easier in many ways, they themselves can sometimes be confusing. Let's start with the most mundane question: "What is a Promise?"

The answer is actually surprisingly simple. A Promise is simply a glorified callback. Or, more acurately, it is an object that one can attach **multiple** callbacks _to_. That really is all there is to it.

Let's look at a few examples. First we have the "old" callback way:

```javascript
function doSomeLongAsynchronousOperation(callMeWhenDone) {
  setTimeout(() => {
    var error = null,
        result = 'Hello world!';

    // Here the operation is complete, so we call
    // the provided callback with the result
    if (error)
      callMeWhenDone(error, null);
    else
      callMeWhenDone(null, result);

  // Random number of milliseconds to wait before we call our callback
  }, Math.random() * 2500);
}

doSomeLongAsynchronousOperation((error, result) => {
  if (error) {
    console.error('Dang! There was an error!', error);
    return;
  }

  console.log('Success!', result);
});
```

With Promises the above example could instead look like:

```javascript
function doSomeLongAsynchronousOperation() {
  // Here we return a Promise that we can bind callback
  // "listeners" to (kind of like binding events to an element)
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      var error = null,
          result = 'Hello world!';

      // Here the operation is complete, so we resolve
      // or reject the promise.
      // as you can see, "resolve" and "reject"
      // are just callbacks, that when called,
      // call all bound promise listeners (also callbacks)
      if (error)
        reject(error);
      else
        resolve(result);

    // Random number of milliseconds to wait before resolution of Promise
    }, Math.random() * 2500);
  });
}

doSomeLongAsynchronousOperation()
  .then((result) => {
    console.log('Success!', result);
  })
  .catch((error) => {
    console.error('Dang! There was an error!', error);
  });
```

So really a Promise is just an abstraction layer between a direct callback (`resolve` and `reject`) and other "bound" listeners (callbacks) provided to `then` or `catch`.

# Re-creating Promise from scratch

In order to "demystify" Promises we are going to write our own implementation of Promise. Don't worry, this is more simple than you might think.

First, we will start by writing the class itself to act much like what I just related above. We will create a class that when instantiated can have callbacks "bound" to it.

```javascript
// nextTick is a simple function that defers execution of the provided
// callback until the next Javascript event "frame"
function onNextTick(callback) {
  // Are we running in an environment that has a "nextTick" function?
  if (typeof process !== 'undefined' && typeof process.nextTick === 'function') {
    // Yes we are, so use it
    process.nextTick(callback);
  } else {
    // No, we aren't, so fallback to a timeout
    setTimeout(callback, 1);
  }
}

class MyPromise {
  constructor(executor) {
    function finalizePromise(asFailure, value) {
      // Here we see if "reject" or "resolve" have already
      // been called. If either has already been called we
      // do nothing and return
      if (alreadyFinalized) return;
      alreadyFinalized = true;

      // update status
      status = (asFailure) ? 'rejected' : 'fulfilled';

      // Here we call the callbacks "on the next tick"
      // (just a little bit later) to allow time
      // for callbacks to be bound. For example, if we didn't
      // wait, and an exception was thrown in the executor
      // (or "reject" was called) then no callbacks
      // could possibly be bound because we haven't even
      // made it out of this constructor yet... so we wait
      // until the next tick to call all callbacks to ensure
      // we give the user time to actually bind callbacks
      onNextTick(() => {
        // Did we fail? If so, call all rejectionCallbacks
        // otherwise call all resolutionCallbacks
        var callbacks = (asFailure) ? this.rejectionCallbacks : this.resolutionCallbacks;

        // Call all callbacks with the resolution value
        callbacks.forEach((callback) => {
          callback(value);
        });
      });
    }

    // private scope variables
    var status = "pending",
        alreadyFinalized = false;

    this.resolutionCallbacks = [];
    this.rejectionCallbacks = [];

    try {
      // Call our "executor" with "resolve" and "reject" arguments
      executor(finalizePromise.bind(this, false), finalizePromise.bind(this, true));
    } catch (e) {
      // If an exception was thrown in the executor immediately
      // reject the promise
      finalizePromise.call(this, true, e);
    }
  }

  // Call this method to attach success and failure listeners
  then(onSuccess, onFailure) {
    if (typeof onSuccess === 'function')
      this.resolutionCallbacks.push(onSuccess);

    if (typeof onFailure === 'function')
      this.rejectionCallbacks.push(onFailure);

    return this;
  }

  // Call this method to attach failure listeners
  catch(onFailure) {
    return this.then(null, onFailure);
  }

  // Call this method to be notified on either failure or success
  finally(onEither) {
    return this.then(onEither, onEither);
  }
}
```

Not too complex, eh'? As you can see when you boil it down, really we are just adding callbacks to an array, and "resolve" or "reject" just calls those callbacks (a single callback calling more callbacks). This is great! Now let's see it in operation:

```javascript
function doSomeLongAsynchronousOperation() {
  return new MyPromise((resolve, reject) => {
    setTimeout(() => {
      var error = null,
          result = 'Hello world!';

      if (error)
        reject(error);
      else
        resolve(result);
    }, Math.random() * 2500);
  });
}

doSomeLongAsynchronousOperation()
  .then((result) => {
    console.log('Success!', result);
  })
  .catch((error) => {
    console.error('Dang! There was an error!', error);
  });
```

When we run this we wait for five seconds and then we will see logged to the console `Success! Hello world!`

Amazing! Now this works, and this example does a really good job of explaining how a promise really works. However, we are missing some key details. The biggest issue here is that "then" doesn't itself return a Promise (like standard implementations). Standard implementations allow callback chaining, like follows:

```javascript
someLongOperationThatReturnsAPromise()
  .then((resultOfFirstPromise) => {
    return someOtherLongOperationThatReturnsAPromise(resultOfFirstPromise);
  })
  .then((finalValue) => {
    console.log('Final value after both promises have resolved: ', finalValue);
  })
```

In standard implementations the above code works properly. It waits first on the first promise (returned from `someLongOperationThatReturnsAPromise`) to resolve. When it does, the first "then" callback is called with the result. The amazing thing that happens next is that this first "then" callback now *returns* another Promise, so the second "then" callback now won't be called *until the returned Promise is resolved!*

This is obviously very useful, but how does it work? Well, behind the scenes, "then" *always* returns a Promise immediately. This Promise is then resolved or rejected *after* the callback returns a value. If the return value is a Promise, it will once again wait for *that* Promise to resolve or reject before it resolves or rejects *itself*. Is that confusing? Here, let me illistrate:

```
someLongOperationThatReturnsAPromise -> (returns Promise A)
(Promise A).then(callback) -> (returns Promise B)
(callback) (when "Promise A" resolves) -> (returns return value C)
(Return value C):
  Is a Promise? -> Wait for it to resolve ->
    Resolve "Promise B" with resolution value
  Is not a Promise? ->
    Resolve "Promise B" with return value C
```

So really, a new Promise is created for *every* call to "then", which will resolve after the previous "then" resolves, which will resolve after the previous-previous "then" resolves, etc... It is a chain of Promises, which all resolve (or reject) only after their "parent" Promise resolves or rejects.

Okay, so how do we implement this? It actually isn't also isn't too hard:

```javascript
// This is a secret private reference that we used to compare
// against the constructor arguments.
// On some promises (such as those created with MyPromise.resolve
// or MyPromise.reject) we don't want the
// 'Possible unhandled promise rejection' warning
// so we use the NO_POSSIBLE_UNHANDLED_WARNING as a constructor
// argument to the MyPromise to disable this warning
const NO_POSSIBLE_UNHANDLED_WARNING = {};

function onNextTick(callback) {
  // Are we running in an environment that has a "nextTick" function?
  if (typeof process !== 'undefined' && typeof process.nextTick === 'function') {
    // Yes we are, so use it
    process.nextTick(callback);
  } else {
    // No, we aren't, so fallback to a timeout
    setTimeout(callback, 1);
  }
}

// This method helps us see if any object is a promise-type object
function isPromiseTypeObject(value) {
  // Is value a MyPromise, a Promise, or any object (duck-typing) that has a "then" and "catch" method?
  return (
    value instanceof MyPromise ||
    value instanceof Promise ||
    (value && typeof value.then === 'function' && typeof value.catch === 'function')
  );
}

// This helps us with callbacks and resolving any parent promise
function callCallback(callback, value, onResolve, onReject) {
  try {
    var returnValue = (typeof callback === 'function') ? callback(value) : value;
    if (isPromiseTypeObject(returnValue))
      returnValue.then(onResolve, onReject);
    else
      onResolve((returnValue !== undefined) ? returnValue : value);
  } catch (error) {
    onReject(error);
  }
}

// Our promise class
class MyPromise {
  constructor(executor, doNotWarnSecretReference) {
    // Fail if supplied executor is not a function
    if (typeof executor !== 'function')
      throw new TypeError('First argument to MyPromise constructor must be a function');

    const finalizePromise = () => {
      // Here we see if "reject" or "resolve" have already
      // been called. If either has already been called we
      // do nothing and return
      if (alreadyFinalized) return;
      alreadyFinalized = true;

      // We use "nextTick" here to ensure callbacks have
      // been bound after the constructor returns
      // before a resolution can take place.
      // If we didn't, the promise might resolve before
      // we could bind any listeners
      onNextTick(() => {
        // Call all resolver callbacks
        var resolutionValue = privateScope.resolutionValue,
            status = privateScope.status,
            isRejected = (status === 'rejected'),
            callbacks = (isRejected) ? privateScope.rejectors : privateScope.resolvers;

        if (doNotWarnSecretReference !== NO_POSSIBLE_UNHANDLED_WARNING && !callbacks.length && isRejected)
          console.warn('Possible unhandled promise rejection');

        for (var i = 0, il = callbacks.length; i < il; i++)
          callbacks[i](resolutionValue);

        // Clear callback queue
        privateScope.rejectors = [];
        privateScope.resolvers = [];
      });
    };

    // Resolver callback to resolve this Promise
    const resolver = (resolveWithValue) => {
      privateScope.resolutionValue = resolveWithValue;
      privateScope.status = 'fulfilled';
      finalizePromise();
    };

    // Rejecter callback to reject this Promise
    const rejecter = (rejectWithValue) => {
      privateScope.resolutionValue = rejectWithValue;
      privateScope.status = 'rejected';
      finalizePromise();
    };

    // This scope variable ensures we don't
    // allow a resolution or rejection more than once
    var alreadyFinalized = false;

    // Set up our internal (private) scope
    // We use this so we don't expose internal
    // variables that we might not want
    // someone mucking with
    var privateScope = {
          // The promise's status
          status: 'pending',
          // The resolution value, for either success or error
          resolutionValue: undefined,
          // Our method that will handle when the promise
          // is resolved or rejected
          finalizePromise,
          // Reference to myself
          thisPromise: this,
          // Arrays to hold bound listeners
          resolvers: [],
          rejectors: []
        };

    // Rebind my then method to this private scope
    // This way WE can always access the private scope
    // but no one else can
    this.then = this.then.bind(this, privateScope);

    // Call executor
    try {
      // Call promise executor
      executor.call(this, resolver, rejecter);
    } catch (e) {
      // An error was thrown in the executor, so reject this promise
      rejecter(e);
    }
  }

  then(privateScope, successCallback, failureCallback) {
    if (!privateScope || privateScope.thisPromise !== this)
      throw new ReferenceError('"then" can only be called on a valid MyPromise object');

    // "then" returns a new promise that can be used for chaining
    // we don't want to throw any "Possible unhandled promise rejection"
    // here because it is perfectly valid to NOT bind to this returned promise
    return new MyPromise((resolve, reject) => {
      privateScope.resolvers.push((value) => callCallback(successCallback, value, resolve, reject));
      privateScope.rejectors.push((value) => callCallback(failureCallback, value, reject, reject));

      if (privateScope.status !== 'pending')
        privateScope.finalizePromise();
    }, NO_POSSIBLE_UNHANDLED_WARNING);
  }

  // Catch is just an alias for "then"
  catch(failureCallback) {
    return this.then(undefined, failureCallback);
  }

  // Finally is just an alias for "then" and "catch"
  finally(finallyCallback) {
    return this.then(finallyCallback, finallyCallback);
  }
}

// Static "resolve" method
MyPromise.resolve = function(value) {
  return new MyPromise((resolve) => {
    resolve(value);
  }, NO_POSSIBLE_UNHANDLED_WARNING);
};

// Static "reject" method
MyPromise.reject = function(value) {
  return new MyPromise((_, reject) => {
    reject(value);
  }, NO_POSSIBLE_UNHANDLED_WARNING);
};
```

Okay, whoa, hold on... what just happened? Yes, I skipped a few steps and snuck a few other implementation details in there. We needed the static `MyPromise.resolve` and `MyPromise.reject` methods in order to pull this off (and it was a standard feature anyhow). They are both simple enough. They just take any value given to them and return an immediately resolved or rejected promise with that value. We also added the helper function `isPromiseTypeObject` which simply helps us decide if any value given to it is a valid promise or not. The last helper we added is `callCallback` which just assists us with calling any callback function provided to it, and will also assist in resolving or rejecting any parent Promise. The last items were just cleanup. We added a private scope so our Promise implementation acts more like a standard implementation where we don't expose internals. So now this is working quite well, and we can chain our Promises:

```javascript
function doSomeLongAsynchronousOperation(resultValue) {
  return new MyPromise((resolve, reject) => {
    setTimeout(() => {
      var error = null,
          result = 'I am resolving with the value: ' + resultValue;

      if (error)
        reject(error);
      else
        resolve(result);
    }, Math.random() * 2500);
  });
}

doSomeLongAsynchronousOperation('First promise')
  .then((result) => {
    return doSomeLongAsynchronousOperation('Second Promise: ' + result);
  })
  .then((finalResult) => {
    console.error('Final result is: ', finalResult);
  });
```

Perfect! Feel free to play around with exceptions and rejections, which also all work. Hopefully at this point Promises are making a little more sense. There is only one last detail we are going to add (for the sake of article length I am not going to attempt to make this a *full* implementation of standard Promise). We need a `MyPromise.all` we we can wait for the resolution of multiple promises. At the bottom of our file we are going to add:

```javascript
// Static "all" method
// this will create a new promise
// that will only resolve
// after all other promises
// have resolved, or will be
// rejected after ANY of the promises
// have been rejected
MyPromise.all = function(_values) {
  // Create an array from the provided values (if it isn't already an array)
  var values = Array.from(_values);

  // Next we setup a counter that is equal to the the number of items to resolve
  // when this counter reaches zero we know that all our promises have resolved
  var resolutionCounter = values.length;

  // It is nicer on memory handling if we allocate the needed Array up-front
  var resolvedValues = new Array(resolutionCounter);

  return new MyPromise((resolve, reject) => {
    // iterate all provided promises / values
    values.forEach((_value, index) => {
      // Here we create a copy of the argument
      // because we might modify the value
      // and it is a bad idea to modify arguments directly
      var value = _value;

      // If this is not a promise, turn it into a resolved promise
      // with the resolution being this "value"
      if (!isPromiseTypeObject(value))
        value = MyPromise.resolve(value);

      // Now we listen for the promise to resolve/reject
      // when it does we adjust our counter.
      // When the counter reaches zero we know that all
      // promises have resolved

      value.then((resolutionValue) => {
        // Collect the resolved value and store it in our
        // array of resolved values
        resolvedValues[index] = resolutionValue;

        // Decrement the counter by one
        resolutionCounter--;

        // Have we finished yet?
        if (resolutionCounter === 0) {
          // now we know that all promises have resolved, so we can resolve ourself
          resolve(resolvedValues);
        }
      }, (error) => {
        // Uh oh... something failed...
        // We don't need to worry about
        // "resolutionCounter" ever reaching
        // zero at this point (and succeeding) because
        // this item failed, so "resolutionCounter"
        // will never be able to reach zero (and hence
        // never succeed)
        reject(error);
      });
    });
  });
};
```

As you can see, waiting on multiple Promises to resolve really is just as simple as a counter, that when it reaches zero means we have full resolution. Simple enough, eh'? Now to try it out!

```javascript
var promises = [];
promises.push(doSomeLongAsynchronousOperation('First promise'));
promises.push(doSomeLongAsynchronousOperation('Second promise'));
promises.push(doSomeLongAsynchronousOperation('Third promise'));
promises.push(doSomeLongAsynchronousOperation('Forth promise'));
MyPromise.all(promises).then((results) => {
  console.log('Results from all Promises: ', results);
});
```

And there you have it! As I said earlier, this isn't an attempt at a full standard implementation, so some things are missing (i.e. `MyPromise.race`, and calling callbacks that are bound *after* the Promise has already resolved). Feel free to implement these details yourself! Doing so would be a great exercise to keep those creative juices flowing!

# Recap

So hopefully now you better understand how Promises work. Again, really it is all just counters, and callbacks that call other callbacks. It may seem complex when you first start using them, but before too long they will become as easy to understand as `new MyPromise((resolve) => (1 + 1)).then((two) => console.log('1 + 1 equals ', two));`

Cheers! In my next article I will be walking you through re-creating React from the ground-up so you can better understand how React works internally. Stay tuned!