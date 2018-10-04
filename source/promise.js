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

module.exports = MyPromise;
