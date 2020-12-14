'use strict';

var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var nconf = require('./lib/config')
var jwt = require('jsonwebtoken');
var multer = require('multer')

var passport = require("passport");
var passportJWT = require("passport-jwt");

var ExtractJwt = passportJWT.ExtractJwt;
var JwtStrategy = passportJWT.Strategy;

var jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: 'TestKey',
    ignoreExpiration: true
}
var strategy = new JwtStrategy(jwtOptions, async function (payload, next) {
   

    let time = new Date().getTime()
    let expTime = payload.exp * 1000
    let user = payload

    if (expTime > time) {
        next(null, user);
    } else {
        next(null, false);
    }

});

passport.use(strategy);

var api = require('./routes/api');

var app = express();

app.use(multer({ dest: "./uploads" }).single("file"));
app.use(passport.initialize());




app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))

app.use('/api', api);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.send({
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.send()
});


app.set('port', process.env.PORT || 3000);

var server = app.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + server.address().port);

});