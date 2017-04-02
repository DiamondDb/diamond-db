const operations = require('diamond-core').operations.external
const {
  SAVE,
  FETCH,
  MAKE_TABLE,
  FILTER
} = operations

class Q {
  constructor(db){
    this.db = db
    this.stack = []
  }
  register(job, cb){
    this.stack.push({ job, cb })
  }
  start(){
    console.log('Queue is listening')
    setInterval(() => {
      if(this.db.isReady() && this.stack.length){
        const next = this.stack.shift()
        const operation = next.job.operation
        const data = next.job.data
        switch(operation){
          case MAKE_TABLE:
            this.db.makeTable(data)
              .then(result => {
                next.cb(result)
              })
              .catch(error => {
                next.cb(error)
              })
            break
          case SAVE:
            this.db.saveRecord(data.table, data.record)
              .then(id => {
                next.cb(id)
              })
              .catch(error => {
                next.cb(error)
              })
            break
          case FETCH:
            this.db.fetchRecord(data.table, data.id)
              .then(record => {
                next.cb(record)
              })
              .catch(error => {
                next.cb(error)
              })
            break
          case FILTER:
            this.db.filterRecords(data)
              .then(records => {
                next.cb(records)
              })
              .catch(error => {
                next.cb(error)
              })
        }
      }
    }, 0)
  }
}

module.exports = Q
