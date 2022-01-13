import { useState } from "react";
import DOMPurify from "dompurify";
import "../../App.css";

function I0x1({ identifiers }) {
  const [I0x2, _] = useState(() => {
    const I0x3 = new URLSearchParams(
      window[window.atob(identifiers["I0x4"])][window.atob(identifiers["I0x5"])]
    )[window.atob(identifiers["I0x6"])](window.atob(identifiers["I0x7"]));

    if (I0x3) {
      const I0x8 = {};
      I0x8[window.atob(identifiers["I0x9"])] = I0x3;

      return I0x8;
    }

    const I0x8 = {};
    I0x8[window.atob(identifiers["I0x9"])] = window.atob(identifiers["I0xA"]);

    return I0x8;
  });

  function I0xB(I0xC) {
    for (const I0xD of I0xC[window.atob(identifiers["I0xE"])]) {
      if (
        window.atob(identifiers["I0x11"]) in
        I0xD[window.atob(identifiers["I0xF"])]
      ) {
        new Function(
          I0xD[window.atob(identifiers["I0x10"])](
            window.atob(identifiers["I0x11"])
          )
        )();
      }

      I0xB(I0xD);
    }
  }

  function I0x12(I0x13) {
    I0x13[window.atob(identifiers["I0x9"])] = DOMPurify[
      window.atob(identifiers["I0x15"])
    ](I0x13[window.atob(identifiers["I0x9"])]);

    let I0x14 = document[window.atob(identifiers["I0x16"])](
      window.atob(identifiers["I0x14"])
    );
    I0x14[window.atob(identifiers["I0x17"])] =
      I0x13[window.atob(identifiers["I0x9"])];
    document[window.atob(identifiers["I0x32"])][
      window.atob(identifiers["I0x18"])
    ](I0x14);

    I0x14 = document[window.atob(identifiers["I0x19"])](
      window.atob(identifiers["I0x14"])
    )[0];
    I0xB(I0x14[window.atob(identifiers["I0x1A"])]);

    document[window.atob(identifiers["I0x32"])][
      window.atob(identifiers["I0x1B"])
    ](I0x14);

    return I0x13;
  }

  return (
    <div className="App">
      <h1>Here is the result!</h1>
      <div id="viewer-container" dangerouslySetInnerHTML={I0x12(I0x2)}></div>
    </div>
  );
}

export default I0x1;
