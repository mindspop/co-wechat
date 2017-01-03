/**
 *
 * koa2-weixin
 * Copyright(c) 2016
 * MIT Licensed
 *
 * Authors:
 *   Mindspop <mindspop@gmail.com>
 *   Jackson Tian
 */

const getRawBody = require('raw-body')
const WXBizMsgCrypt = require('wechat-crypto')
const xml2js = require('xml2js')
const crypto = require('crypto')

const encryptCompiled = require('./tpl').encryptCompiled
const compiled = require('./tpl').compiled

function getSignature(timestamp, nonce, token) {
  const shasum = crypto.createHash('sha1')
  const arr = [token, timestamp, nonce].sort()
  shasum.update(arr.join(''))

  return shasum.digest('hex')
}

function reply2CustomerService(fromUserName, toUserName, kfAccount) {
  const info = {}
  info.msgType = 'transfer_customer_service'
  info.createTime = new Date().getTime()
  info.toUserName = toUserName
  info.fromUserName = fromUserName
  info.content = {}
  if (typeof kfAccount === 'string') {
    info.content.kfAccount = kfAccount
  }
  return compiled(info)
}

/*!
 * 将xml2js解析出来的对象转换成直接可访问的对象
 */
function formatMsg(xmlObj) {
  const message = {}
  if (typeof xmlObj === 'object') {
    Object.keys(xmlObj).forEach((key) => {
      const isArray = Array.isArray(xmlObj[key])

      if (isArray && xmlObj[key].length === 1) {
        const val = xmlObj[key][0]
        if (typeof val === 'object') {
          message[key] = formatMsg(val)
        } else {
          message[key] = (val || '').trim()
        }
      } else if (isArray) {
        message[key] = xmlObj[key].map((item) => formatMsg(item))
      }
    })
  }
  return message
}

/*!
 * 将内容回复给微信的封装方法
 */
function reply(content, fromUserName, toUserName) {
  const info = {}
  let type = 'text'
  info.content = content || ''
  if (Array.isArray(content)) {
    type = 'news'
  } else if (typeof content === 'object') {
    if (Object.prototype.hasOwnProperty.call(content, 'type')) {
      if (content.type === 'customerService') {
        return reply2CustomerService(fromUserName, toUserName, content.kfAccount)
      }
      type = content.type
      info.content = content.content
    } else {
      type = 'music'
    }
  }

  info.msgType = type
  info.createTime = new Date().getTime()
  info.toUserName = toUserName
  info.fromUserName = fromUserName
  return compiled(info)
}

async function parseXML(xml) {
  return new Promise((resolve, reject) => {
    xml2js.parseString(xml, { trim: true }, (err, object) => {
      if (err) {
        reject(err)
      } else {
        resolve(object)
      }
    })
  })
}

function weixin(config) {
  let token
  let appid
  let encodingAESKey

  let cryptor

  if (typeof config === 'string') {
    token = config
  } else if (typeof config === 'object' && config.token) {
    token = config.token
    appid = config.appid || ''
    encodingAESKey = config.encodingAESKey || ''
  } else {
    throw new TypeError('please check your config')
  }

  if (encodingAESKey) {
    cryptor = new WXBizMsgCrypt(token, encodingAESKey, appid)
  }

  return async function weixin(ctx, next) {
    const query = ctx.query
    const encrypted = !!(query.encrypt_type &&
                         query.encrypt_type === 'aes' &&
                         query.msg_signature)

    const timestamp = query.timestamp
    const nonce = query.nonce
    const echostr = query.echostr
    const method = ctx.method

    if (method === 'GET') {
      const valid = query.signature === getSignature(timestamp, nonce, token)
      if (!valid) {
        ctx.throw(401, 'Invalid signature')
        return
      }

      ctx.body = echostr
    } else if (method === 'POST') {
      const xml = await getRawBody(ctx.req, {
        length: ctx.length,
        limit: '1mb',
        encoding: ctx.charset,
      })

      // save original xml
      ctx.state.weixinXml = xml

      // parse xml
      let decodedXML = await parseXML(xml)
      let formatted = formatMsg(decodedXML.xml)

      if (encrypted) {
        const encryptMessage = formatted.Encrypt
        const msgSignature = cryptor.getSignature(timestamp, nonce, encryptMessage)
        if (query.msg_signature !== msgSignature) {
          ctx.throw(401, 'Invalid signature')
          return
        }

        const decryptedXML = cryptor.decrypt(encryptMessage)
        const messageWrapXml = decryptedXML.message
        if (messageWrapXml === '') {
          ctx.throw(401, 'Invalid signature')
          return
        }
        decodedXML = await parseXML(messageWrapXml)
        formatted = formatMsg(decodedXML.xml)
      }

      // save formatted msg object
      ctx.state.weixin = formatted

      // get session
      // wxsession vs session
      // if (ctx.sessionStore) {
        // ctx.state.wxSessionId = formatted.FromUserName
        // ctx.state.wxsession = await ctx.sessionStore.get(ctx.state.wxSessionId)
        // if (!ctx.state.wxsession) {
          // ctx.state.wxsession = {}
          // ctx.state.wxsession.cookie = ctx.session.cookie
        // }
      // }

      // handle domain business
      await next()

      // update session
      // if (ctx.sessionStore) {
        // if (!ctx.state.wxsession) {
          // if (ctx.state.wxSessionId) {
            // await ctx.sessionStore.destroy(ctx.state.wxSessionId)
          // }
        // } else {
          // await ctx.sessionStore.set(ctx.state.wxSessionId, ctx.state.wxsession)
        // }
      // }

      /*
       * 根据 body 信息，返回给微信消息
       * 假如服务器无法保证在五秒内处理并回复，可以直接回复空串。
       * 否则微信服务器会发起 3 次重试。
       */
      if (ctx.body === '') {
        return
      }

      const replyMessageXml = reply(ctx.body, formatted.ToUserName, formatted.FromUserName)

      if (!query.encrypt_type || query.encrypt_type === 'raw') {
        ctx.body = replyMessageXml
      } else {
        const wrap = {}
        wrap.encrypt = cryptor.encrypt(replyMessageXml)
        wrap.nonce = parseInt((Math.random() * 100000000000), 10)
        wrap.timestamp = new Date().getTime()
        wrap.signature = cryptor.getSignature(wrap.timestamp, wrap.nonce, wrap.encrypt)
        ctx.body = encryptCompiled(wrap)
      }

      ctx.type = 'application/xml'
    } else {
      ctx.throw(501, 'Not Implemented')
    }
  }
}

module.exports = weixin
