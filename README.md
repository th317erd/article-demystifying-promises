# Demystifying Promises

Asynchronous code can be confusing sometimes. Most people understand a callback: "Call me when you are done". Simple. But what about Promises? Though Promises make our lives easier in many ways, they themselves can sometimes be confusing. Let's start with the most mundane question: "What is a Promise?"

The answer is actually surprisingly simple. A Promise is simply a glorified callback. Or, more acurately, it is an object that one can attach MULTIPLE callbacks _to_. That really is all there is to it.

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
  }, 5000);
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
function doSomeLongAsynchronousOperation(callMeWhenDone) {
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
    }, 5000);
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

So really a Promise is just an abstraction layer between a direct callback ("resolve" or "reject") and other bound callbacks (provided to "then" or "catch").

# Re-creating Promise from scratch

In order to "demystify" Promises we are going to write our own implementation of Promise. Don't worry, this is more simple than you might think.

