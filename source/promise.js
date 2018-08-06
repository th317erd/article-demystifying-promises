
function isPromiseTypeObject(value) {
  // Is value a MyPromise, a Promise, or any object (duck-typing) that has a "then" and "catch" method?
  return (
    value instanceof MyPromise ||
    value instanceof Promise ||
    (value && typeof value.then === 'function' && typeof value.catch === 'function')
  );
}

function callCallback(callback, value, parentResolve, parentReject) {
  return new MyPromise((resolve, reject) => {
    const doResolve = (value) => {
            resolve(value);
            parentResolve(value);
          },
          doReject = (error) => {
            reject(value);
            parentReject(value);
          };

    try {
      var returnValue = (typeof callback === 'function') ? callback(value) : value;
      if (isPromiseTypeObject(returnValue))
        returnValue.then(doResolve, doReject);
      else
        doResolve(returnValue);
    } catch (error) {
      doReject(error);
    }
  });
}

class MyPromise {
  constructor(executor) {
    // Fail if supplied executor is not a function
    if (typeof executor !== 'function')
      throw new TypeError('First argument to MyPromise constructor must be a function');

    const handleFulfillment = () => {
      // We use "nextTick" here to ensure callbacks have
      // been bound after the constructor returns
      // before a resolution can take place
      process.nextTick(() => {
        // Call all resolver callbacks
        var resolutionValue = privateScope.resolutionValue,
            status = privateScope.status,
            isRejected = (status === 'rejected'),
            callbacks = (isRejected) ? privateScope.rejectors : privateScope.resolvers;

        if (!callbacks.length && isRejected)
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
      handleFulfillment();
    };

    // Rejecter callback to reject this Promise
    const rejecter = (rejectWithValue) => {
      privateScope.resolutionValue = rejectWithValue;
      privateScope.status = 'rejected';
      handleFulfillment();
    };

    // Set up our internal (private) scope
    var privateScope = {
      status: 'pending',
      resolutionValue: undefined,
      handleFulfillment,
      thisPromise: this,
      resolvers: [],
      rejectors: []
    };

    // Rebind my then method to this private scope
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

    return new MyPromise((resolve, reject) => {
      privateScope.resolvers.push((value) => callCallback(successCallback, value, resolve, reject));
      privateScope.rejectors.push((value) => callCallback(failureCallback, value, resolve, reject));

      if (privateScope.status !== 'pending')
        privateScope.handleFulfillment();
    });
  }

  catch(failureCallback) {
    return this.then(undefined, failureCallback);
  }

  finally(finallyCallback) {
    return this.then(finallyCallback, finallyCallback);
  }
}

// Static "resolve" method
MyPromise.resolve = function(value) {
  return new MyPromise((resolve) => {
    resolve(value);
  })
};

// Static "reject" method
MyPromise.reject = function(value) {
  return new MyPromise((_, reject) => {
    reject(value);
  })
};

module.exports = MyPromise;
