const diamondUtils = require('diamond-core')
const { STORE_RECORD, FETCH_RECORD } = diamondUtils.operations

class Stack {
  constructor(size, lru){
    this.size = size || 8
    this.data = []
    this.lru = lru
  }
  push(item){
    const index = this.data.push(item) - 1
    if(this.data.length > this.size){
      this.data.shift()
      this.lru.shiftAll()
      return index - 1
    }
    return index
  }
  pop(){
    return this.data.pop()
  }
  accessItem(index){
    if(!this.data[index]) return false
    const item = this.data[index]
    this.data.splice(index, 1)
    this.lru.adjust(index)
    const newIndex = this.push(item)
    return { newIndex, item }
  }
}

class Lru {
  constructor(size){
    this.hash = Object.create(null)
    this.stack = new Stack(size, this)
  }
  adjust(index){
    Object.keys(this.hash).forEach(key => {
      if(this.hash[key] >= index){
        this.hash[key]--
      }
    })
  }
  shiftAll(){
    Object.keys(this.hash).forEach(key => {
      const index = this.hash[key]
      if(index){
        this.hash[key]--
      } else {
        delete this.hash[key]
      }
    })
  }
  put(key, item){
    const index = this.hash[key]
    if(index){
      const { newIndex } = this.stack.accessItem(index)
      this.hash[key] = newIndex
    } else {
      const newIndex = this.stack.push(item)
      this.hash[key] = newIndex
    }
  }
  get(key){
    const index = this.hash[key]
    if(index === undefined) return false
    const { newIndex, item } = this.stack.accessItem(index)
    this.hash[key] = newIndex
    return item
  }
}

const makeRecordKey = (table, id) => `_${table.name}_${id}`

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
  message(message){
    switch(message.operation){
      case STORE_RECORD:
        this.storeRecord(message.data)
        return Promise.resolve()
      case FETCH_RECORD:
        return this.fetchRecord(message.data)
    }
  }
}

module.exports = LruCache
