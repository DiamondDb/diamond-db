const operations = require('diamond-core').operations

module.exports = class DummyCache {
  message(){
    return Promise.resolve(operations.success(null))
  }
}
