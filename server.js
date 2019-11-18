const express = require('express');
const {
  join
} = require('path');
const app = express();
const jwt = require('express-jwt');
const jwks = require('jwks-rsa');
const port = process.env.PORT || 3000;
const request = require('request');

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

app.get('/userProfileInfo', async (req, res) => {
  const userID = req.query.user_id;
  const googleAccessToken = await getGoogleAccessToken(userID);
  const connectionCount = await getUserConnections(googleAccessToken);
  const userGender = await getUserGender(googleAccessToken);
  res.end(JSON.stringify({
    connectionCount,
    userGender
  }));
});

app.get('/*', (_, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

app.listen(port);

function getAuth0AccessToken() {
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
  });
}

async function getGoogleAccessToken(userID) {
  const creds = await getAuth0AccessToken();
  const access_token = creds.access_token;
  var options = {
    method: 'GET',
    url: `https://dev-nuxjd7sz.auth0.com/api/v2/users/${userID}`,
    headers: {
      authorization: `Bearer ${access_token}`
    }
  };
  return new Promise(resolve => {
    request(options, function (error, response, body) {
      var googleAccessToken = JSON.parse(body).identities[0].access_token;
      resolve(googleAccessToken);
    });
  });
}

async function getUserConnections(googleAccessToken) {
  var options = {
    method: 'GET',
    url: `https://people.googleapis.com/v1/people/me/connections?requestMask.includeField=person.names`,
    headers: {
      authorization: `Bearer ${googleAccessToken}`
    }
  };
  return new Promise(resolve => {
    request(options, function (error, response, body) {
      if (response && response.statusCode == 200) {
        var googleConnections = JSON.parse(body);
        if (googleConnections && googleConnections.connections) {
          resolve(googleConnections.connections.length);
        }
      }
    });
  });
}

function getUserGender(googleAccessToken) {
  var options = {
    method: 'GET',
    url: 'https://people.googleapis.com/v1/people/me?personFields=genders',
    headers: {
      authorization: `Bearer ${googleAccessToken}`
    }
  };
  return new Promise(resolve => {
    request(options, function (error, response, body) {
      if (response && response.statusCode == 200) {
        const data = JSON.parse(body);
        resolve(data.genders[0].formattedValue);
      }
    });
  })
}