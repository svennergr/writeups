import { useState } from "react";
import DOMPurify from "dompurify";
import "../../App.css";

function I0x1({ identifiers }) {
  const [I0x2, _] = useState(() => {
    const I0x3 = new URLSearchParams(window["location"]["search"])["get"](
      "payload"
    );

    if (I0x3) {
      const I0x8 = {};
      I0x8["__html"] = I0x3;

      return I0x8;
    }

    const I0x8 = {};
    I0x8["__html"] = "<h1 style='color: #00bfa5'>Nothing here!</h1>";

    return I0x8;
  });

  function I0xB(I0xC) {
    for (const I0xD of I0xC["children"]) {
      if ("data-debug" in I0xD["attributes"]) {
        new Function(I0xD["getAttribute"]("data-debug"))();
      }

      I0xB(I0xD);
    }
  }

  function sanitize(htmlInput) {
    htmlInput["__html"] = DOMPurify["sanitize"](htmlInput["__html"]);

    let templateElement = document["createElement"]("template");
    templateElement["innerHTML"] = htmlInput["__html"];
    document["body"]["appendChild"](templateElement);

    templateElement = document["getElementsByTagName"]("template")[0];
    I0xB(templateElement["content"]);

    document["body"]["removeChild"](templateElement);

    return htmlInput;
  }

  return (
    <div className="App">
      <h1>Here is the result!</h1>
      <div id="viewer-container" dangerouslySetInnerHTML={sanitize(I0x2)}></div>
    </div>
  );
}

export default I0x1;
