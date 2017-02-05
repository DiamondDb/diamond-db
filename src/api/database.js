const core = require('diamond-core')
const constants = require('./constants')
const DummyCache = require('./dummyCache')

const { validate, schemaLength } = core.schemaUtils
const { INIT, BUSY, READY } = constants
const {
  success,
  failure,
  fetchRecord,
  storeRecord,
  makeTable,
  writeToDisk,
  initialize,
  updateMeta
} = core.operations

module.exports = class Database {
  constructor(options){
    this.persist = options.store
    this.cache = options.cache ? options.cache : new DummyCache()
    this.tables = {}
    this.status = INIT
  }
  init(options){
    return this.persist.message(initialize())
    .then((success) => {
      this.tables = success.data || {}  /* success message holds payload on data */
      this.status = READY
      this.start(options)
    })
    .catch((e) => {
      console.log('Initialize error: ', e)
      this.status = READY
      this.start(options)
    })
  }
  start({ persist }){
    /* TODO fragile */
    if(persist !== false){
      setInterval(() => {
        this.writeToDisk()
      }, persist )
    }
  }
  isReady(){
    return this.status === READY
  }
  makeTable(name, schema){
    const size = schemaLength(schema)
    const newTable = { name, size, schema, index: 0 } // TODO eww object reference
    this.tables[name] = newTable
    /* Question: is it necessary to persist tables on creation?
     * We re-write all tables on calls to writeToDisk()
     */
    this.status = BUSY
    return this.persist.message(makeTable(newTable))
      .then(() => {
        this.status = READY
        return success()
      })
      .catch((e) => {
        this.status = READY
        return failure(e)
      })
  }
  saveRecord(tableName, record){
    const table = this.tables[tableName]
    return validate(table.schema, record)
      .then(() => {
        const id = table.index++
        this.cache.message(storeRecord(table, record, id))
        return this.persist.message(storeRecord(table, record, id))
            .then(() => success(Object.assign({ _id: id }, record)))
            .catch((e) => failure(e))
        }).catch((e) => failure(e))
  }
  fetchRecord(tableName, id){
    const table = this.tables[tableName]
    if(id < 0 || id >= table.index){
      return Promise.reject(failure(`ERROR: no record at index ${id} in table ${tableName}`))
    }
    return this.cache.message(fetchRecord(table, id)).then((response) => {
      if(response.operation === 'SUCCESS' && response.data){
        return response
      } else {
        return this.persist.message(fetchRecord(table, id)).then(response => {
          if(response.operation === 'SUCCESS' && response.data){
            this.cache.message(storeRecord(table, response.data, id))
          }
          return response
        })
      }
    })
  }
  writeToDisk(){
    this.persist.message(updateMeta(this.tables))
    return this.persist.message(writeToDisk())
  }
}
