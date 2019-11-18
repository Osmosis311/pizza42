const express = require('express');
const {
  join
} = require('path');
const app = express();
const jwt = require('express-jwt');
const jwks = require('jwks-rsa');
const port = process.env.PORT || 3000;
const request = require("request");

app.use(express.static(join(__dirname, 'public')));

const jwtCheck = jwt({
  secret: jwks.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: 'https://dev-nuxjd7sz.auth0.com/.well-known/jwks.json'
  }),
  audience: 'orders',
  issuer: 'https://dev-nuxjd7sz.auth0.com/',
  algorithms: ['RS256']
});

app.get('/orders', jwtCheck, (req, res) => {
  res.end(
    JSON.stringify([{
      orderID: 1,
      pizzas: 7,
      toppings: 'onion'
    }])
  );
});

app.get('/auth_config.json', (req, res) => {
  res.sendFile(join(__dirname, 'auth_config.json'));
});

app.get('/connections', (req, res) => {
  const userID = req.query.user_id;
  getUserConnections(userID, res);
});

app.get('/*', (_, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

app.listen(port);

function getAccessToken() {
  var options = {
    method: 'POST',
    url: 'https://dev-nuxjd7sz.auth0.com/oauth/token',
    headers: {
      'content-type': 'application/json'
    },
    body: '{"client_id":"Uwa9PrcnmAc0QyqJCr59o8FsQ41FlOQN","client_secret":"7cHWor0NiHlRf8HlMhQf3LTYgBmsu_DTjxxApSTHOHzsyeYLdfCmFnV37NrgAokB","audience":"https://dev-nuxjd7sz.auth0.com/api/v2/","grant_type":"client_credentials"}'
  };

  return new Promise((resolve) => {
    request(options, function (error, response, body) {
      if (error) throw new Error(error);
      resolve(JSON.parse(body));
    });
  })
}

async function getUserConnections(userID, res) {
  const creds = await getAccessToken();
  const access_token = creds.access_token;
  var options = {
    method: 'GET',
    url: `https://dev-nuxjd7sz.auth0.com/api/v2/users/${userID}`,
    headers: {
      authorization: `Bearer ${access_token}`
    }
  };

  request(options, function (error, response, body) {
    var googleAccessToken = JSON.parse(body).identities[0].access_token;
    var options = {
      method: "GET",
      url: `https://people.googleapis.com/v1/people/me/connections?requestMask.includeField=person.names`,
      headers: {
        authorization: `Bearer ${googleAccessToken}`
      }
    };
    request(options, function (error, response, body) {
      var googleConnections = JSON.parse(body);
      res.end(JSON.stringify({connectionCount: googleConnections.connections.length}));
    });
  });
}