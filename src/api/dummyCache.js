const operations = require('diamond-core').operations.internal

module.exports = class DummyCache {
  message(){
    return Promise.resolve(operations.success(null))
  }
}
