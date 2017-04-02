const request = require('request')
const Store = require('./testStore')
const assert = require('assert')
const { Database, server } = require('../src/main')

const operations = require('diamond-core').operations.external
const url = 'http://localhost:2020/query'
let store = new Store()
let db = new Database({ store })
const peopleTable = { name: 'people', schema: { name: ['string', 15], age: ['number', 3] } }
const storedTable = { index: 0, size: 18, name: 'people', schema: { name: ['string', 15], age: ['number', 3] } }
const johnResponse = { _id: 0, name:'John', age: 20 }

describe('main API', () => {
  before((done) => {
    db.init({ persist: 500 })
    server(db)
    done()
  })
  it('makes a table', (done) => {
    request.post({
      url,
      form: JSON.stringify(operations.makeTable(peopleTable))
    }, (err, httpRes, body) => {
      assert.deepEqual(db.tables.people, storedTable)
      done()
    })
  })
  it('stores a record', (done) => {
    request.post({
      url,
      form: JSON.stringify(operations.save('people', {
        name: 'John',
        age: 20
      }))
    }, (err, httpRes, body) => {
      const response = JSON.parse(body)
      assert.deepEqual(response.data, johnResponse)
      done()
    })
  })
  it('fetches a record', (done) => {
    setTimeout(() => {
      request.post({
        url,
        form: JSON.stringify(operations.fetch('people', 0))
      }, (err, httpRes, body) => {
        const response = JSON.parse(body)
        assert.deepEqual(response.data, johnResponse)
        done()
      })
    }, 510)
  })
})
