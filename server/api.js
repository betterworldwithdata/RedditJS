var fs = require("fs");
var request = require('request');
var async = require('async');

var REDDIT_CONSUMER_KEY = process.env.REDDIT_KEY;
var REDDIT_CONSUMER_SECRET = process.env.REDDIT_SECRET;

module.exports = {

  get: function(res, req) {

    var url = require('url');
    var url_parts = url.parse(req.url, true);
    var urlStr = url_parts.query.url
    var queryParams = url_parts.path.replace('/api/?url=', '');
    queryParams = queryParams.replace(urlStr, '')

    delete queryParams.url;
    queryParams = this.ltrim(queryParams, '&');

    urlStr = 'https://oauth.reddit.com/' + urlStr + '?' + queryParams.toString();

    var options = {
      url: urlStr,
      timeout: 30000,
      headers: {
        'User-Agent': 'RedditJS/1.1 by ' + req.user.name,
        'Authorization': "bearer " + req.user.access_token
      },
      form: url_parts.query
    }

    request.get(options, function(error, response, body) {

      if (error) {
        if (typeof response !== 'undefined' && typeof response.statusCode !== 'undefined') {
          return res.sendStatus(404)
        } else {
          return res.sendStatus(500)
        }
      }

      if (typeof response !== 'undefined' && (response.statusCode == 200 || response.statusCode == 304)) {
        return res.json(JSON.parse(body))
      } else {
        return res.sendStatus(404)
      }
    });

  },
  post: function(res, req) {
    var url = require('url');
    var url_parts = url.parse(req.url, true);
    var urlStr = url_parts.query.url

    var queryParams = url_parts.path.replace('/api/?url=', '');
    queryParams = url_parts.path.replace('/api/?url=', '');
    //queryParams = queryParams.replace(urlStr, '')
    delete queryParams.url;
    queryParams = this.ltrim(queryParams, '&');
    urlStr = 'https://oauth.reddit.com/' + urlStr + '?' + queryParams.toString();

    var options = {
      url: urlStr,
      headers: {
        //'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'RedditJS/1.1 by ' + req.user.name,
        'Authorization': "bearer " + req.user.access_token
      },
      form: req.body,
    };

    request.post(options, function(error, response, body) {

      if (error) {

        if (typeof response !== 'undefined' && typeof response.statusCode !== 'undefined') {
          res.sendStatus(response.statusCode)
        } else {
          res.sendStatus(500)
        }
        return
      }

      if (!error && response.statusCode == 200 || response.statusCode == 304) {
        res.json(JSON.parse(body))
      } else {
        res.sendStatus(response.statusCode)
      }
    });

  },
  getTitle: function(res, req) {

    var url = require('url');
    var url_parts = url.parse(req.url, true);
    var url = url_parts.query.url

    var urlOpts = {
      url: url,
      path: '/',
      port: '80'
    };

    var re = /(<\s*title[^>]*>(.+?)<\s*\/\s*title)>/g;

    request.get(urlOpts, function(error, response, body) {

      if (error) {
        if (typeof response !== 'undefined' && typeof response.statusCode !== 'undefined') {
          res.sendStatus(response.statusCode)
        } else {
          res.sendStatus(500)
        }
        return
      }

      if (!error && (response.statusCode == 200 || response.statusCode == 304)) {
        var match = re.exec(body);
        if (match && match[2]) {
          res.send(200, match[2])
        }

      } else {
        //body = JSON.parse(body)
        res.json(404, {
          code: '404'
        })
      }
    });

  },
  ltrim: function(str, chr) {
    var rgxtrim = (!chr) ? new RegExp('^\\s+') : new RegExp('^' + chr + '+');
    return str.replace(rgxtrim, '');
  },

  //for users not logged in
  getNonAuth: function(res, req) {

    var url = require('url');

    var url_parts = url.parse(req.url, true);
    var urlStr = url_parts.query.url
    var cookie = url_parts.query.cookie
    var queryParams = url_parts.path.replace('/api/?url=', '');
    queryParams = queryParams.replace(urlStr, '')

    delete queryParams.url;
    queryParams = this.ltrim(queryParams, '&');

    urlStr = 'http://api.reddit.com/' + urlStr + '?' + queryParams.toString();

    var options = {
      url: urlStr,
      headers: {
        Cookie: 'reddit_session=' + cookie,
        'User-Agent': 'RedditJS/1.1',

      },
      form: url_parts.query,
    }

    request.get(options, function(error, response, body) {
      if (error) {
        if (typeof response !== 'undefined' && typeof response.statusCode !== 'undefined') {
          return res.sendStatus(404)
        } else {
          return res.sendStatus(500)
        }
      }

      if (typeof response !== 'undefined' && (response.statusCode == 200 || response.statusCode == 304)) {
        return res.json(JSON.parse(body))
      } else {
        return res.sendStatus(404)
      }
    });

  },
  postNonAuth: function(res, req) {
    var url = require('url');
    var url_parts = url.parse(req.url, true);
    var urlStr = url_parts.query.url
    var cookie = url_parts.query.cookie
    var queryParams = url_parts.path.replace('/api/?url=', '');
    queryParams = url_parts.path.replace('/api/?url=', '');
    //queryParams = queryParams.replace(urlStr, '')
    delete queryParams.url;
    queryParams = this.ltrim(queryParams, '&');
    urlStr = 'http://api.reddit.com/' + urlStr + '?' + queryParams.toString();

    var options = {
      url: urlStr,
      headers: {
        Cookie: 'reddit_session=' + cookie,
        'User-Agent': 'RedditJS/1.1'
      },
      form: req.body,
    };

    request.post(options, function(error, response, body) {
      if (error) {
        if (typeof response !== 'undefined' && typeof response.statusCode !== 'undefined') {
          return res.sendStatus(404)
        } else {
          return res.sendStatus(500)
        }
      }

      if (typeof response !== 'undefined' && (response.statusCode == 200 || response.statusCode == 304)) {
        return res.json(JSON.parse(body))
      } else {
        return res.sendStatus(404)
      }
    });

  },

}
