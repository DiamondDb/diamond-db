const Lru = require('./lru.js')
const diamondUtils = require('diamond-core')
const {
  STORE_RECORD, FETCH_RECORD,
  STORE_FILTER_RESULT, FETCH_FILTER_RESULT
} = diamondUtils.operations

const makeRecordKey = (table, id) => `_${table.name}_${id}`
const makeFilterKey = (tableName, key, comparator, value) => `${tableName}_${key}_${comparator}_${value}`

class LruCache {
  constructor(size){
    this.lru = new Lru(size)
  }
  storeRecord({ table, record, id }){
    const recordKey = makeRecordKey(table, id)
    this.lru.put(recordKey, record)
  }
  fetchRecord({ table, id }){
    const recordKey = makeRecordKey(table, id)
    const record = this.lru.get(recordKey)
    if(record === false){
      return Promise.reject(`Record ${id} in table "${table.name}" not found.`)
    }
    return Promise.resolve(record)
  }
  storeFilterResult({ tableName, result, query }){
    const { key, comparator, value } = query
    const cacheKey = makeFilterKey(tableName, key, comparator, value)
    this.lru.put(cacheKey, result)
  }
  message(message){
    switch(message.operation){
      case STORE_RECORD:
        this.storeRecord(message.data)
        return Promise.resolve()
      case FETCH_RECORD:
        return this.fetchRecord(message.data)
      case STORE_FILTER_RESULT:
        this.storeFilterResult(message.data)
        return Promise.resolve()
      case FETCH_FILTER_RESULT:
        return this.fetchFilterResult(message.data)
    }
  }
}

module.exports = LruCache
