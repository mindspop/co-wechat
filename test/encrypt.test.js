const expect = require('chai').expect
const querystring = require('querystring')
const supertest = require('supertest')
const WXBizMsgCrypt = require('wechat-crypto')
const koa = require('koa')

const compiled = require('../lib/tpl').compiled
const wxQuery = require('../lib/util').wxQuery
const wechat = require('../lib/weixin')

const app = new koa()

function request() {
  return supertest(app.callback())
}

const config = {
  token: 'some token',
  appid: 'wxc107bb57144a5test',
  encodingAESKey: 'J5ii3dwYpHNGkKfHgucfnc28S3UjZK9gmp3viUFJGCV',
}

const cryptor = new WXBizMsgCrypt(config.token, config.encodingAESKey, config.appid)

app.use(wechat(config))

app.use(async (ctx, next) => {
  const info = ctx.state.weixin

  if (info.FromUserName === 'diaosi') {
    ctx.body = 'hehe'
  } else {
    ctx.throw(403, 'This user name is forbidden')
  }
})

let info
beforeEach(() => {
  info = {
    toUserName: 'nvshen',
    fromUserName: 'diaosi',
    msgType: 'text',
    createTime: new Date().getTime(),
    content: '测试中',
  }
})

describe('weixin.js for encrypt', function () {
  describe('Valid respond for encrypt', function () {
    it('should be ok', function (done) {
      const xml = compiled(info)
      const queryConfig = {
        appid: config.appid,
        encodingAESKey: config.encodingAESKey,
        token: config.token,
        xml,
      }

      request()
      .post(`/wechat?${wxQuery(queryConfig)}`)
      .send(xml)
      .expect(200, done)
    })

    it('should be 403', function (done) {
      info.fromUserName = 'wrong'

      const xml = compiled(info)
      const queryConfig = {
        appid: config.appid,
        encodingAESKey: config.encodingAESKey,
        token: config.token,
        xml,
      }

      request()
      .post(`/wechat?${wxQuery(queryConfig)}`)
      .send(xml)
      .expect(403, done)
    })
  })
})
