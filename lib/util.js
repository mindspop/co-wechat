const crypto = require('crypto')
const WXBizMsgCrypt = require('wechat-crypto')
const querystring = require('querystring')

exports.wxQuery = ({
  token = 'some token',
  encodingAESKey = '',
  appid = '',
  xml = '',
  encryptType = 'aes',
} = {}) => {
  const q = {
    timestamp: new Date().getTime(),
    nonce: parseInt((Math.random() * 10e10), 10),
  }

  if (encodingAESKey) {
    const cryptor = new WXBizMsgCrypt(token, encodingAESKey, appid)
    q.encrypt_type = encryptType
    q.signature = cryptor.getSignature(q.timestamp, q.nonce, cryptor.encrypt(xml))
  } else {
    const s = [token, q.timestamp, q.nonce].sort().join('')
    q.signature = crypto.createHash('sha1').update(s).digest('hex')
    q.echostr = 'ping'
  }

  return querystring.stringify(q)
}
