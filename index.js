require('dotenv').config();

var express = require('express');
var request = require('request');
var cors = require('cors');
var cookieParser = require('cookie-parser');
var generateRandomString = require('./helpers/index').generateRandomString;

var client_id = process.env.CLIENT_ID;
var client_secret = process.env.CLIENT_SECRET;
var redirect_uri = process.env.REDIRECT_URI;

var app = express();

const corsOptions = {
    origin: true, //included origin as true
    credentials: true, //included credentials as true
};


app.use(express.static(__dirname + '/public'))
    .use(cors(corsOptions))
    .use(cookieParser());

app.get('/login', function(req, res) {

    res.header("Access-Control-Allow-Headers", "*");
    res.header('Access-Control-Allow-Credentials', true);

    var storedState = generateRandomString(16);

    res.cookie('lol', storedState);
    res.cookie('test', 'test');

    // your application requests authorization
    var scope = 'user-read-private user-read-email user-read-playback-state';
    res.redirect('https://accounts.spotify.com/authorize?' +
        new URLSearchParams({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: storedState
        }).toString()
    );
});

app.get('/callback', function(req, res) {

    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies['lol'] : null;

    if (state !== storedState) {
        res.clearCookie('lol');
        res.redirect('/#' +
            new URLSearchParams({
                error: 'state_mismatch'
            }).toString()
        )
    } else {
        request.post('https://accounts.spotify.com/api/token', {
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirect_uri
            }).toString(),
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
                'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
            },
            json: true
        }, function (error, response, body) {
            console.log(response.statusCode);
          if (!error && response.statusCode === 200) {
            const url = 'http://localhost:3000' + '?' +
              new URLSearchParams({
                access_token: body.access_token,
                refresh_token: body.refresh_token
              }).toString();
            res.redirect(url);
            } else {

                return res.redirect('http://localhost:3000' +
                    new URLSearchParams({
                        error: 'invalid_token'
                    }).toString()
                );
            }
        });

    }
});

app.get('/refresh_token', function(req, res) {
    var refresh_token = req.query.refresh_token;
    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: {
            'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
        },
        form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        },
        json: true
    };

    request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            var access_token = body.access_token;
            res.send({
                'access_token': access_token
            });
        }
    });
});

app.listen(process.env.PORT || 4000);
