const core = require('diamond-core')
const constants = require('./constants')
const DummyCache = require('./dummyCache')

const { validate, schemaLength } = core.schemaUtils
const { INIT, BUSY, READY } = constants
const {
  success, failure,
  fetchRecord, storeRecord, filterRecords,
  makeTable, writeToDisk,
  initialize, updateMeta
} = core.operations.internal

const succeeded = (constant) => constant === 'SUCCESS'

module.exports = class Database {
  constructor(options){
    this.persist = options.store
    this.cache = options.cache || new DummyCache()
    this.tables = {}
    this.status = INIT
  }
  tableExists(tableName){
    if(!this.tables[tableName]) {
      throw new Error(`Table "${tableName}" does not exist.`)
    }
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
  makeTable({ tableData: { name, schema }}){
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
    try { this.tableExists(tableName) } catch(e) { return failure(e) }
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
    try { this.tableExists(tableName) } catch(e) { return failure(e) }
    const table = this.tables[tableName]
    if(id < 0 || id >= table.index){
      return Promise.reject(failure(`ERROR: no record at index ${id} in table ${tableName}`))
    }
    return this.cache.message(fetchRecord(table, id)).then((response) => {
      if(succeeded(response.operation) && response.data){
        return response
      } else {
        return this.persist.message(fetchRecord(table, id)).then(response => {
          if(succeeded(response.operation) && response.data){
            this.cache.message(storeRecord(table, response.data, id))
          }
          return response
        })
      }
    })
  }
  filterRecords({ tableName, key, comparator, value }){
    try { this.tableExists(tableName) } catch(e) { return failure(e) }
    const table = this.tables[tableName]
    return this.persist.message(filterRecords(table, key, comparator, value))
      .then(results => success(results))
      .catch(e => failure(e))
  }
  writeToDisk(){
    this.persist.message(updateMeta(this.tables))
    return this.persist.message(writeToDisk())
  }
}
