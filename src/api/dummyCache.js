const diamondUtils = require('diamond-core')
const { STORE_RECORD, FETCH_RECORD } = diamondUtils.operations.internal

module.exports = class DummyCache {
  message(message){
    switch(message.operation){
      case STORE_RECORD:
        return Promise.resolve()
      case FETCH_RECORD:
        return Promise.reject()
    }
  }
}
