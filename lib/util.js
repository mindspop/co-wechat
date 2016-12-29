const crypto = require('crypto')
const querystring = require('querystring')

exports.wxQuery = (token = 'some token') => {
  const q = {
    timestamp: new Date().getTime(),
    nonce: parseInt((Math.random() * 10e10), 10)
  }
  const s = [token, q.timestamp, q.nonce].sort().join('')
  q.signature = crypto.createHash('sha1').update(s).digest('hex')
  q.echostr = 'ping'

  return querystring.stringify(q)
}
