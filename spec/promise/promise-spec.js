const MyPromise = require('../../source/promise');
const TIMEOUT_WINDOW = 50;

// This helper fails a test if a MyPromise is rejected
// when it shouldn't be
function doFail() {
  fail('MyPromise was resolved/rejected when it should not have been');
}

// This helper method will return a random
// number of milliseconds for timeouts
function getRandomTimeoutInterval() {
  return Math.round(TIMEOUT_WINDOW * Math.random());
}

describe("Promise", function() {
  it('should be able to create and resolve a simple MyPromise', function(done) {
    var counter = 0;
    (new MyPromise((resolve, reject) => {
      counter++;
      setTimeout(() => {
        resolve(counter + 1);
      }, getRandomTimeoutInterval());
    })).then((value) => {
      expect(value).toBe(2);
      done();
    }, doFail);

    expect(counter).toBe(1);
  });

  it('should be able to create and reject a simple MyPromise', function(done) {
    var counter = 0;
    (new MyPromise((resolve, reject) => {
      counter++;
      setTimeout(() => {
        counter++;
        reject('There was an error!');
      }, getRandomTimeoutInterval());
    })).then(doFail, (error) => {
      expect(counter).toBe(2);
      expect(error).toBe('There was an error!');
      done();
    });

    expect(counter).toBe(1);
  });

  it('should be able to resolve a chain of MyPromises', function(done) {
    var counter = 0;
    (new MyPromise((resolve, reject) => {
      counter++;
      setTimeout(() => {
        resolve(counter + 1);
      }, getRandomTimeoutInterval());
    })).then((value) => {
      expect(value).toBe(2);
      return value + 1;
    }, doFail).then((value) => {
      expect(value).toBe(3);
      return value + 1;
    }, doFail).then((value) => {
      expect(value).toBe(4);
      done();
    }, doFail);

    expect(counter).toBe(1);
  });

  it('should be able to reject a chain of MyPromises', function(done) {
    var counter = 0;
    (new MyPromise((resolve, reject) => {
      counter++;
      setTimeout(() => {
        counter++;
        reject('There was an error!');
      }, getRandomTimeoutInterval());
    })).then(doFail, (error) => {
      expect(error).toBe('There was an error!');
      expect(counter).toBe(2);
      counter++;
    }).then(doFail, (error) => {
      expect(error).toBe('There was an error!');
      expect(counter).toBe(3);
      counter++;
    }).then(doFail, (error) => {
      expect(error).toBe('There was an error!');
      expect(counter).toBe(4);
      done();
    });

    expect(counter).toBe(1);
  });

  it('should be able to chain MyPromises and return MyPromises from callbacks', function(done) {
    var counter = 0;
    (new MyPromise((resolve, reject) => {
      counter++;
      setTimeout(() => {
        resolve(counter + 1);
      }, getRandomTimeoutInterval());
    })).then((value) => {
      expect(value).toBe(2);
      return new MyPromise((resolve) => {
        setTimeout(() => {
          resolve(value + 1);
        }, getRandomTimeoutInterval());
      });
    }, doFail).then((value) => {
      expect(value).toBe(3);
      return value + 1;
    }, doFail).then((value) => {
      expect(value).toBe(4);
      done();
    }, doFail);

    expect(counter).toBe(1);
  });

  it('should be able to resolve on multiple MyPromises with "all"', function(done) {
    var promises = [],
        resolutionValues = ['hello', 'my', 'own', 'promise', 'implementation'];

    promises = resolutionValues.map((resolutionValue) => {
      // Randomly return something OTHER than
      // a promise, because MyPromise.all should
      // also be able to handle non-promise values
      if (Math.random() < 0.5)
        return resolutionValue;

      // Return a promise that will resolve sometime in the future
      return new MyPromise((resolve) => {
        setTimeout(() => {
          resolve(resolutionValue);
        }, getRandomTimeoutInterval());
      });
    });

    // Now await on everything
    MyPromise.all(promises).then((values) => {
      values.forEach((value, index) => {
        expect(resolutionValues[index]).toBe(value);
      });

      done();
    }, doFail)
  });
});
