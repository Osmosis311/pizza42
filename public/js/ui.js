const router = {
  '/': () => showContent('content-home'),
  '/profile': () =>
    requireAuth(() => showContent('content-profile'), '/profile'),
  '/login': () => login()
};

const eachElement = (selector, fn) => {
  for (let e of document.querySelectorAll(selector)) {
    fn(e);
  }
};

const showContentFromUrl = (url) => {
  if (router[url]) {
    router[url]();
    return true;
  }
  return false;
};

const isRouteLink = (element) =>
  element.tagName === 'A' && element.classList.contains('route-link');

const showContent = (id) => {
  eachElement('.page', (p) => p.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
};

const updateUI = async () => {
  try {
    const isAuthenticated = await auth0.isAuthenticated();

    if (isAuthenticated) {
      const user = await auth0.getUser();

      console.dir(user);
      const connectionsReq = await fetch(`/connections?user_id=${user.sub}`);
      const connectionsData = await connectionsReq.json();

      console.dir(connectionsData);

      if (connectionsData && connectionsData.connectionCount) {
        document.getElementById('connections').innerHTML = `Wow, you have ${connectionsData.connectionCount} connections!`;
      }

      if(user.email_verified) {
        document.getElementById('checkOrders').classList.remove('hidden');
        document.getElementById('verifyEmail').classList.add('hidden');
      } else {
        document.getElementById('verifyEmail').classList.remove('hidden');
      }
      document.getElementById('profile-data').innerText = JSON.stringify(
        user,
        null,
        2
      );
      document.querySelectorAll('pre code').forEach(hljs.highlightBlock);
      eachElement('.profile-image', (e) => (e.src = user.picture));
      eachElement('.user-name', (e) => (e.innerText = user.name));
      eachElement('.user-email', (e) => (e.innerText = user.email));
      eachElement('.auth-invisible', (e) => e.classList.add('hidden'));
      eachElement('.auth-visible', (e) => e.classList.remove('hidden'));
    } else {
      eachElement('.auth-invisible', (e) => e.classList.remove('hidden'));
      eachElement('.auth-visible', (e) => e.classList.add('hidden'));
      document.getElementById('checkOrders').classList.add('hidden');
      document.getElementById('verifyEmail').classList.add('hidden');
    }
  } catch (err) {
    console.log('Error updating UI!', err);
    return;
  }
};

document.getElementById('checkOrders').addEventListener('click', async () => {
  const accessToken = await auth0.getTokenSilently();
  const result = await fetch('/orders', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  const data = await result.json();
  document.getElementById('lastOrder').innerHTML = `Your last order had ${data[0].pizzas} pizzas with a topping of ${data[0].toppings}!`;
});

window.onpopstate = (e) => {
  if (e.state && e.state.url && router[e.state.url]) {
    showContentFromUrl(e.state.url);
  }
};
