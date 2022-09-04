"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const axios_1 = __importDefault(require("axios"));
const app = (0, express_1.default)();
const port = 3002;
const apiBase = 'https://graph.facebook.com/';
class WhaBot {
    /**
     * Initiate the WhaBot app
     *
     */
    constructor(options) {
        const { token, webhookToken, phoneID } = options;
        if (!token)
            throw new Error("Token must be specified");
        if (!webhookToken)
            throw new Error("webhookToken must be specified");
        if (!phoneID)
            throw new Error("phoneID must be specified");
        this.token = token;
        this.webhookToken = webhookToken;
        this.phoneID = phoneID;
        this.callbacks = [];
        app.use(body_parser_1.default.json());
        app.get('/webhooks', (req, res) => {
            console.log(req.query);
            if (req.query['hub.verify_token'] === this.webhookToken) {
                res.send(req.query['hub.challenge']);
            }
            res.status(400).send();
        });
        app.post('/webhooks', (req, res) => __awaiter(this, void 0, void 0, function* () {
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
                        else if (callback.matching === 'array' && callback.pattern.some((element) => {
                            return element.toLowerCase() === message.text.body.toLowerCase();
                        })) {
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
            res.status(200).send({ status: 'success' });
        }));
        app.use(express_1.default.static(__dirname + '/public'));
        app.listen(port, () => {
            console.log(`Example app listening on port ${port}`);
        });
    }
    send(to, message, options = { type: 'text' }) {
        return __awaiter(this, void 0, void 0, function* () {
            const { type } = options;
            const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + this.token };
            const reply = { "messaging_product": "whatsapp", "to": to, "type": type, text: { "body": message } };
            const url = apiBase + 'v13.0/' + this.phoneID + '/messages';
            const res = yield axios_1.default.post(url, reply, { headers });
            console.log(res.data);
            return res.data;
        });
    }
    sendImage(to, message, options = { type: 'image' }) {
        return __awaiter(this, void 0, void 0, function* () {
            const { type } = options;
            const header = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + this.token };
            const reply = { "messaging_product": "whatsapp", "to": to, "type": type, image: { "link": message } };
            const url = apiBase + 'v13.0/' + this.phoneID + '/messages';
            const res = yield fetch(url, { method: 'post', headers: header, body: JSON.stringify(reply) });
            const resp = yield res.json();
            console.log(resp);
            return resp;
        });
    }
    on(type, pattern, fn) {
        let matching = 'string';
        if (Object.prototype.toString.call(pattern) == '[object RegExp]') {
            matching = 'regexp';
        }
        else if (typeof (pattern) === 'object') {
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
