const MyPromise = require('../../source/promise');
const TIMEOUT = 50;

describe("Promise", function() {
  it("should be able to create and use a simple MyPromise", function(done) {
    var counter = 0;
    (new MyPromise((resolve, reject) => {
      counter++;
      setTimeout(() => {
        resolve(counter + 1);
      }, TIMEOUT);
    })).then((value) => {
      expect(value).toBe(2);
      done();
    });

    expect(counter).toBe(1);
  });

  it("should be able to chain MyPromises", function(done) {
    var counter = 0;
    (new MyPromise((resolve, reject) => {
      counter++;
      setTimeout(() => {
        resolve(counter + 1);
      }, TIMEOUT);
    })).then((value) => {
      expect(value).toBe(2);
      return value + 1;
    }).then((value) => {
      expect(value).toBe(3);
      return value + 1;
    }).then((value) => {
      expect(value).toBe(4);
      done();
    });

    expect(counter).toBe(1);
  });

  it("should be able to chain MyPromises and return MyPromises from callbacks", function(done) {
    var counter = 0;
    (new MyPromise((resolve, reject) => {
      counter++;
      setTimeout(() => {
        resolve(counter + 1);
      }, TIMEOUT);
    })).then((value) => {
      expect(value).toBe(2);
      return new MyPromise((resolve) => {
        setTimeout(() => {
          resolve(value + 1);
        }, TIMEOUT);
      });
    }).then((value) => {
      expect(value).toBe(3);
      return value + 1;
    }).then((value) => {
      expect(value).toBe(4);
      done();
    });

    expect(counter).toBe(1);
  });
});
