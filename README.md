Database
------------
The DiamondDB database uses schemas that specify the character length of each field in a record. There's one schema per table, and the database validates records for incorrect keys and record size. The database currently has three basic methods: fetchRecord saveRecord and makeTable.

**Make Table**   
Make table takes a table name and a schema. The table object is stored on the database module and a blocking message is sent to the persistence layer to save the table metadata to disk. That the persistence of tables is blocking and not asynchronous was a relatively arbitrary decision and may be changed in the future.

**Save Record**   
Save record first validates the record to be saved, sends a storeRecord message to the cache and then a storeRecord message to the persistence layer. Saving records is asynchronous but the record with its generated id is returned irrespective of what happens with the persistence layer.

**Fetch Record**   
Fetch record takes a table name and an id and returns the record with that id or null if not found. The database returns an error if the id is out of range for the table. The fetchRecord method first sends a fetchRecord message to the cache module. If the cache module returns a success message with data, then that message is returned. If not, a fetchRecord message is sent to the persistence module, a storeRecord message is sent to the cache, and finally the return value from the message sent to the persistence module is returned.

Server
------
The server included with this repo accepts the following POST requests for testing purposes. Here are some example queries for using that server:

This query creates a new table called "people" that has a schema with a fifteen character long name field and a three character long age field. If it succeeds, you'll get a `1` back. The number one means "I did it!" in computer speak:
```javascript
{
"operation":"TABLE_CREATE",
  "data": {
    "name": "people",
    "schema": {
      "name": ["string", 15],
      "age": ["number", 3]
    }
  }
}
```

This query saves the record contained in the "body" field of the post to the "people" table. It will return the ID of the saved record:
```javascript
{
"operation":"SAVE",
  "data": {
  	"table": "people",
  	"body": {
  		"name": "Abby",
  		"age": 29
  	}
  }
}
```

This query fetches and returns the record from the "people" table with the ID of 6:
```javascript
{
"operation":"FETCH",
  "data": {
	"table": "people",
	"id": 6
  }
}
```
