const Lru = require('../src/lru/lru')
const assert = require('assert')

const test1 = { key: 'a', value: 'James' }
const test2 = { key: 'b', value: 'David' }
const test3 = { key: 'c', value: 'Jeremy' }
const test4 = { key: 'd', value: 'Ronald' }

describe('lru cache', () => {
  it('stores and retrieves by key', () => {
    const lru = new Lru()
    lru.put(test1.key, test1.value)
    const result = lru.get(test1.key)
    assert.equal(result, test1.value)
  })
  it('pushes out the oldest item', () => {
    const lru = new Lru(3)
    lru.put(test1.key, test1.value)
    lru.put(test2.key, test2.value)
    lru.put(test3.key, test3.value)
    lru.put(test4.key, test4.value)
    const result = lru.get(test4.key)
    const emptyResult = lru.get(test1.key)
    assert.equal(result, test4.value)
    assert.equal(emptyResult, false)
  })
  it('puts the most recently used item at the head', () => {
    const lru = new Lru(3)
    lru.put(test1.key, test1.value)
    lru.put(test2.key, test2.value)
    lru.put(test3.key, test3.value)
    lru.get(test1.key)
    const newest = lru.newestItem()
    lru.put(test4.key, test4.value)
    const result = lru.get(test1.key)
    assert.equal(newest, test1.value)
    assert.equal(result, test1.value)
  })
})
