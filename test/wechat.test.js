const expect = require('chai').expect
const querystring = require('querystring')
const supertest = require('supertest')
const Koa = require('koa')

const compiled = require('../lib/tpl').compiled
const wxQuery = require('../lib/util').wxQuery
const wechat = require('../lib/weixin')

const app = new Koa()

function request() {
  return supertest(app.callback())
}

app.use(wechat('some token'))

app.use(async (ctx) => {
  // 微信输入信息都在this.weixin上
  const info = ctx.state.weixin

  // 回复屌丝(普通回复)
  if (info.FromUserName === 'diaosi') {
    ctx.body = 'hehe'
  } else if (info.MsgType === 'music') {
    ctx.body = {
      type: 'music',
      content: {
        title: '约么',
        description: '今天天气不错',
        musicUrl: 'www.test.com',
        hqUrl: 'www.test2.com',
      },
    }
  } else if (info.Event === 'location_select') {
    ctx.body = {
      type: 'text',
      content: '这是一个位置消息事件',
    }
  } else {
    ctx.body = {
      type: 'news',
      content: [
        {
          title: '约么',
          description: '今天天气不错',
          picUrl: 'www.test.com',
          url: 'www.test.com',
        },
      ],
    }
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

describe('weixin.js', function () {
  describe('Valid GET', function () {
    it('should be 401 without signature', function (done) {
      request()
      .get('/wechat')
      .expect(401)
      .expect('Invalid signature', done)
    })

    it('should be 200 with correct signature', function (done) {
      request()
      .get(`/wechat?${wxQuery()}`)
      .expect(200)
      .expect('ping', done)
    })

    it('should be 401 with invalid signature', function (done) {
      const q = {
        timestamp: new Date().getTime(),
        nonce: parseInt((Math.random() * 10e10), 10),
      }
      q.signature = 'invalid_signature'
      q.echostr = 'ping'
      request()
      .get(`/wechat?${querystring.stringify(q)}`)
      .expect(401)
      .expect('Invalid signature', done)
    })
  })

  describe('Valid POST', function () {
    // it('should be 401 without signature', function (done) {
      // request()
      // .post('/wechat')
      // .expect(401)
      // .expect('Invalid signature', done)
    // })

    // it('should be 200 with correct signature', function (done) {
      // request()
      // .get(`/wechat?${wxQuery()}`)
      // .expect(200)
      // .expect('ping', done)
    // })

    // it('should be 401 with invalid signature', function (done) {
      // const q = {
        // timestamp: new Date().getTime(),
        // nonce: parseInt((Math.random() * 10e10), 10)
      // }
      // q.signature = 'invalid_signature'
      // q.echostr = 'ping'
      // request()
      // .post(`/wechat?${querystring.stringify(q)}`)
      // .expect(401)
      // .expect('Invalid signature', done)
    // })
  })

  describe('Other methods are not implemented', function () {
    it('should be 501 for head method', function (done) {
      request()
      .head(`/wechat?${wxQuery()}`)
      .expect(501, done)
    })

    it('should be 501 for put method', function (done) {
      request()
      .put(`/wechat?${wxQuery()}`)
      .expect(501, done)
    })
  })

  describe('Valid respond for different msg types', function () {
    it('should be ok', function (done) {
      request()
      .post(`/wechat?${wxQuery()}`)
      .send(compiled(info))
      .expect(200)
      .end(function (err, res){
        if (err) return done(err)

        const body = res.text.toString()
        expect(body).to.include('<ToUserName><![CDATA[diaosi]]></ToUserName>')
        expect(body).to.include('<FromUserName><![CDATA[nvshen]]></FromUserName>')
        expect(body).to.match(/<CreateTime>\d{13}<\/CreateTime>/)
        expect(body).to.include('<MsgType><![CDATA[text]]></MsgType>')
        expect(body).to.include('<Content><![CDATA[hehe]]></Content>')
        done()
      })
    })

    it('should be ok with news type', function (done) {
      info = {
        fromUserName: 'nvshen',
        toUserName: 'gaofushuai',
        msgType: 'news',
        createTime: new Date().getTime(),
        content: [
          {
            title: '约么',
            description: '今天天气不错',
            picUrl: 'www.test.com',
            url: 'www.test.com',
          },
        ],
      }

      request()
      .post(`/wechat?${wxQuery()}`)
      .send(compiled(info))
      .expect(200)
      .end(function (err, res){
        if (err) return done(err)

        const body = res.text.toString()
        expect(body).to.include('<MsgType><![CDATA[news]]></MsgType>')
        expect(body).to.include('<ArticleCount>1</ArticleCount>')
        expect(body).to.include('<Title><![CDATA[约么]]></Title>')
        expect(body).to.include('<Description><![CDATA[今天天气不错]]></Description>')
        expect(body).to.include('<PicUrl><![CDATA[www.test.com]]></PicUrl>')
        expect(body).to.include('<Url><![CDATA[www.test.com]]></Url>')
        done()
      })
    })

    it('should be ok with music type', function (done) {
      info = {
        fromUserName: 'nvshen',
        toUserName: 'gaofushuai',
        msgType: 'music',
        createTime: new Date().getTime(),
        content: {
          title: '约么',
          description: '今天天气不错',
          musicUrl: 'www.test.com',
          hqUrl: 'www.test2.com',
        },
      }

      request()
      .post(`/wechat?${wxQuery()}`)
      .send(compiled(info))
      .expect(200)
      .end(function(err, res){
        if (err) return done(err)

        const body = res.text.toString()
        expect(body).to.include('<MsgType><![CDATA[music]]></MsgType>')
        expect(body).to.include('<Title><![CDATA[约么]]></Title>')
        expect(body).to.include('<Description><![CDATA[今天天气不错]]></Description>')
        expect(body).to.include('<MusicUrl><![CDATA[www.test.com]]></MusicUrl>')
        expect(body).to.include('<HQMusicUrl><![CDATA[www.test2.com]]></HQMusicUrl>')
        done()
      })
    })

    // TODO: Fix
    it.skip('should ok with event location_select', function (done) {
      info = {
        fromUserName: 'nvshen',
        toUserName: 'gaofushuai',
        msgType: 'event',
        createTime: new Date().getTime(),
        xPos: '80',
        yPos: '70',
        label: 'alibaba',
        event: 'location_select',
        eventKey: 'sendLocation',
        content: '测试中',
      }

      request()
      .post(`/wechat?${wxQuery()}`)
      .send(compiled(info))
      .expect(200)
      .end(function(err, res){
        if (err) return done(err)

        const body = res.text.toString()
        expect(body).to.include('<ToUserName><![CDATA[nvshen]]></ToUserName>')
        expect(body).to.include('<FromUserName><![CDATA[gaofushuai]]></FromUserName>')
        expect(body).to.match(/<CreateTime>\d{13}<\/CreateTime>/)
        expect(body).to.include('<MsgType><![CDATA[event]]></MsgType>')
        expect(body).to.include('<Content><![CDATA[这是一个位置消息事件]]></Content>')
        done()
      })
    })

    // TODO: Fix
    it.skip('should ok with customer service', function (done) {
      const info = {
        sp: 'gaofushuai',
        user: 'cs',
        type: 'text',
        text: '测试中'
      }

      request()
      .post(`/wechat?${wxQuery()}`)
      .send(compiled(info))
      .expect(200)
      .end(function(err, res){
        if (err) return done(err)
        const body = res.text.toString()
        body.should.include('<ToUserName><![CDATA[cs]]></ToUserName>')
        body.should.include('<FromUserName><![CDATA[gaofushuai]]></FromUserName>')
        body.should.match(/<CreateTime>\d{13}<\/CreateTime>/)
        body.should.include('<MsgType><![CDATA[transfer_customer_service]]></MsgType>')
        done()
      })
    })


    // TODO: Fix
    it.skip('should ok with transfer info to kfAccount', function(done) {
      const info = {
        sp: 'zhong',
        user: 'kf',
        type: 'text',
        text: '测试中'
      }
      request()
      .post(`/wechat?${wxQuery()}`)
      .send(compiled(info))
      .expect(200)
      .end((err, res) => {
        if (err) return done(err)

        const body = res.text.toString()
        body.should.include('<ToUserName><![CDATA[kf]]></ToUserName>')
        body.should.include('<FromUserName><![CDATA[zhong]]></FromUserName>')
        body.should.match(/<CreateTime>\d{13}<\/CreateTime>/)
        body.should.include('<MsgType><![CDATA[transfer_customer_service]]></MsgType>')
        body.should.include('<KfAccount><![CDATA[test1@test]]></KfAccount>')
        return done()
      })
    })
  })
})
