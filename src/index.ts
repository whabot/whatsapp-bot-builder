import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';

const app = express();
const port = 3002;

const apiBase = 'https://graph.facebook.com/';

class WhaBot {
  token: string;
  webhookToken: string;
  phoneID: string;
  callbacks: Array<{type: string, matching: string, pattern: any, call: Function}>;
    
  
  /**
   * Initiate the WhaBot app
   * 
   */
  constructor(options: any) {
    const {token, webhookToken, phoneID} = options;
    if (!token) throw new Error("Token must be specified");
    if (!webhookToken) throw new Error("webhookToken must be specified");
    if (!phoneID) throw new Error("phoneID must be specified");
    
    this.token = token;
    this.webhookToken = webhookToken;
    this.phoneID = phoneID;
    this.callbacks = [];

    app.use(bodyParser.json());

    app.get('/webhooks', (req:express.Request, res:express.Response) => {
      console.log(req.query);
      if (req.query['hub.verify_token'] === this.webhookToken) {
        res.send(req.query['hub.challenge']);
      }
      res.status(400).send();
    })
    app.post('/webhooks', async (req:express.Request, res:express.Response) => {
      //TODO: Verify token
      console.log(JSON.stringify(req.body));
      const value = req.body.entry[0].changes[0].value;
      if (value.messages) {
        const message = value.messages[0];
        const profile = value.contacts[0].profile;

        for (const callback of this.callbacks) {
          if (callback.type === 'message') {
            console.log('message', message);
            console.log('callback', callback);
            if (callback.matching === 'string' && message.text.body.toUpperCase() === callback.pattern.toUpperCase()) {
              callback.call(message, profile);
              break;
            }
            else if (callback.matching === 'regexp' && callback.pattern.test(message.text.body)) {
              callback.call(message, profile);
              break;
            }
            else if (callback.matching === 'array' &&  callback.pattern.some((element :string) => {
              return element.toLowerCase() === message.text.body.toLowerCase();
            })){
              callback.call(message, profile);
              break;
            }
            else if (callback.matching === 'default') {
              callback.call(message, profile);
              break;
            }
          }
        }
      }
      res.status(200).send({status: 'success'});
    });
    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`)
    })
  }

  async send(to: any, message: any, options: {type: string} = {type: 'text'}) {
    const {type} = options;
    const headers = {'Content-Type': 'application/json', Authorization: 'Bearer ' + this.token};
    const reply = { "messaging_product": "whatsapp", "to": to, "type": type, text: { "body":  message} };
    const url = apiBase + 'v13.0/' + this.phoneID + '/messages';
    const res = await axios.post(url, reply, {headers});
    console.log(res.data);

    return res.data;
  }

  async sendImage(to: any, message: any, options: {type: string} = {type: 'text'}) {
    let {type} = options;
    if (!type) type = 'image';
    const header = {'Content-Type': 'application/json', Authorization: 'Bearer ' + this.token};
    const reply = { "messaging_product": "whatsapp", "to": to, "type": type, image: { "link":  message} };
    const url = apiBase + 'v13.0/' + this.phoneID + '/messages';
    const res = await fetch(url, {method: 'post', headers: header, body: JSON.stringify(reply)});
    const resp = await res.json();
    console.log(resp);

    return resp;
  }

  on(type: any, pattern: string, fn: any) {
    let matching = 'string';

    if (Object.prototype.toString.call(pattern) == '[object RegExp]') {
      matching = 'regexp';
    }
    else if (typeof(pattern) === 'object') {
      matching = 'array';
    }
    else if (pattern === '*') {
      matching = 'default';
    }
    
    const callback = {
      type: type,
      pattern: pattern,
      matching: matching,
      call: fn,
    };
    this.callbacks.push(callback);
  }
}

module.exports = WhaBot;