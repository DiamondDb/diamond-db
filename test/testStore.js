const core = require('diamond-core')
const recordUtils = core.recordUtils
const tableUtils = core.tableUtils
const {
  PERSIST_ALL, INITIALIZE_PERSISTANCE,
  MAKE_TABLE, UPDATE_META,
  FETCH_RECORD, STORE_RECORD, FILTER_RECORDS,
} = core.operations.internal

const PAGE_SIZE = 5
const makeFileName = (path, name, idx) => `${path}${name}.${idx}.dat`

const parsePage = (table, page) => {
  const regex = new RegExp('.{1,' + table.size + '}', 'g')
  const recordStrings = page.match(regex)
  return recordStrings.map(recordString => {
    return recordUtils.parseRecord(recordString, table.schema)
  })
}

const makeFileMap = (operations, rootPath) => {
  return operations.reduce((map, op) => {
    const { table, record, id } = op.data
    const pageIdx = Math.floor(id/PAGE_SIZE)
    const fileName = `${rootPath}${table.name}.${pageIdx}.dat`
    const recordString = recordUtils.makeRecordString(table, record)
    map[fileName] = map[fileName] || []
    map[fileName][id] = recordString
    return map
  }, {})
}

const testFunctions = {
  EQ: (value, testValue) => value === testValue,
  LT: (value, testValue) => value < testValue,
  GT: (value, testValue) => value > testValue
}

const makeFilterFunc = (key, comparator, testValue) => {
  const test = testFunctions[comparator]
  return (records, result) => {
    for(let i = 0; i < records.length; i++){
      const record = records[i]
      const value = record[key]
      if(test(value, testValue)){
        result.results.push(record)
      }
    }
  }
}

const makeIndexArray = (n) => {
  const arr = []
  for(let i = 0; i < n; i++){
    arr[i] = i
  }
  return arr
}

module.exports = class Store {
  constructor() {
    this.meta = null
    this.root = 'root'
    this.operations = []
    this.records = {}
    this.latestMetaUpdate = null
  }
  init(){
    if(this.meta && this.meta.length){
      return Promise.resolve(tableUtils.parseTableString(this.meta))
    } else {
      return Promise.resolve()
    }
  }
  _clearOperations() {
    const operations = this.operations.slice()
    this.operations = []
    return operations
  }
  updateMeta() {
    const tables = this.latestMetaUpdate && this.latestMetaUpdate.tables
    if(tables){
      let meta = ''
      Object.keys(tables).forEach(tableName => {
        meta += tableUtils.makeTableString(tables[tableName])
      })
      this.meta = meta
    }
      return Promise.resolve()
  }
  makeTable({ tableData }) {
    if(!tableData){
      return Promise.reject('Create table message did not contain new table')
    }
    const tableString = tableUtils.makeTableString(tableData)
    this.meta += tableString
    return Promise.resolve()
  }
  /* called by persist */
  _save(fileName, records) {
    this.records[fileName] = this.records[fileName] || ''
    this.records[fileName] += records
    return Promise.resolve()
  }
  fetch({ table, id }){
    const schemaLength = table.size
    const pageIdx = Math.floor(id/PAGE_SIZE)
    const recordIdx = id % PAGE_SIZE
    const fileName = makeFileName(this.root, table.name, pageIdx)
    const page = this.records[fileName]
    const position = recordIdx * schemaLength
    const recordString = page.substring(position, position+schemaLength)
    const record = recordUtils.parseRecord(recordString, table.schema)
    record._id = id
    return Promise.resolve(record)
  }
  filter({ table, query: { key, comparator, value } }, resolve, reject){
    const numRecords = table.index-1
    const numPages = Math.ceil(numRecords/PAGE_SIZE)
    const indices = makeIndexArray(numPages)
    let filterFunc = makeFilterFunc(key, comparator, value)
    let retries = {}, result = { results: [] }
    while(indices.length){
      const pageNumber = indices.pop()
      const fileName = makeFileName(this.root, table.name, pageNumber)
      const page = this.records[fileName]
      const records = parsePage(table, page)
      filterFunc(records, result)
    }
    resolve(result)
  }
  persist(){
    const operations = this._clearOperations()
    const storeOperations = operations.filter(msg => msg.operation === STORE_RECORD)
    const fileMap = makeFileMap(storeOperations, this.root)
    const promises = Object.keys(fileMap).map(fileName => {
      const recordString = fileMap[fileName].join('')
      return this._save(fileName, recordString)
    })
    if(promises.length){
      return this.updateMeta().then(() => Promise.all(promises))
    } else {
      return Promise.resolve()
    }
  }
  message(message){
    switch(message.operation){
      case UPDATE_META:
        this.latestMetaUpdate = message.data
        return Promise.resolve()
      case MAKE_TABLE:
        return this.makeTable(message.data)
      case STORE_RECORD:
        this.operations.push(message)
        return Promise.resolve()
      case FETCH_RECORD:
        return this.fetch(message.data)
      case FILTER_RECORDS:
        return new Promise((resolve, reject) => {
          this.filter(message.data, resolve, reject)
        })
      case INITIALIZE_PERSISTANCE:
        return this.init()
      case PERSIST_ALL:
        return this.persist()
    }
  }
}
