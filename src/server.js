const Q = require('./Queue')
const http = require('http')

const headers = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST",
  "access-control-allow-headers": "content-type, accept",
  "access-control-max-age": 60 // Seconds.
};
const port = process.env.PORT || 2020
const ip = '127.0.0.1'

module.exports = function(db){
  const q = new Q(db)

  const server = http.createServer(requestHandler);
  server.listen(port, ip);
  console.log('Server started...')
  q.start()

  function requestHandler(req, res){
    console.log('request...')
    res.writeHead(200, headers);
    retrieveData(req, function(data){
      if(req.url === '/query'){
        q.register(data, (result) => {
          res.end(JSON.stringify(result))
        })
      } else {
        res.end()
      }
    })
  }

  function retrieveData(request, cb){
    let result = ''
    request.on('data', (chunk) => {
      result += chunk.toString();
    });
    request.on('end', () => {
      cb(JSON.parse(result));
    })
  }
}
