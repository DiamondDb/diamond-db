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
  /* for testing */
  newestItem(){
    const idx = this.stack.data.length-1
    return this.stack.data[idx]
  }
}

module.exports = Lru
