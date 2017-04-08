const diamondUtils = require('diamond-core')
const {
  STORE_RECORD, FETCH_RECORD,
  STORE_FILTER_RESULT, FETCH_FILTER_RESULT
} = diamondUtils.operations.internal

module.exports = class DummyCache {
  message(message){
    switch(message.operation){
      case STORE_RECORD:
      case STORE_FILTER_RESULT:
        return Promise.resolve()
      case FETCH_RECORD:
      case FETCH_FILTER_RESULT:
        return Promise.reject()
    }
  }
}
