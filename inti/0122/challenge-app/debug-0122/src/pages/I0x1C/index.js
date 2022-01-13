import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../../App.css";

function I0x1C({ identifiers }) {
  const [I0x7, I0x1D] = useState("");
  const I0x1E = useRef();

  const I0x1F = useNavigate();

  function I0x20(I0x21) {
    I0x21["preventDefault"]();

    I0x1F(`${"/result?payload="}${encodeURIComponent(I0x7)}`);
  }

  return (
    <div className="App">
      <h1>Super Secure HTML Viewer</h1>
      <form onSubmit={I0x20}>
        <textarea
          ref={I0x1E}
          value={I0x7}
          spellCheck={false}
          onChange={(e) =>
            I0x1D(
              e["target"][
                "value"
              ]
            )
          }
          onKeyDown={(e) => {
            if (
              e["key"] ===
              "Tab"
            ) {
              e["preventDefault"]();

              if (!e["shiftKey"]) {
                e["target"][
                  "setRangeText"
                ](
                  "    ",
                  e["target"][
                    "selectionStart"
                  ],
                  e["target"][
                    "selectionStart"
                  ],
                  "end"
                );

                I0x1D(
                  e["target"][
                    "value"
                  ]
                );
              } else {
                let I0x2C = 0;

                for (
                  let i =
                    e["target"][
                      "selectionStart"
                    ] - 1;
                  i > 0;
                  i--
                ) {
                  if (
                    e["target"][
                      "value"
                    ][i] === "
"
                  ) {
                    I0x2C = i + 1;
                    break;
                  }
                }

                if (
                  e["target"][
                    "value"
                  ]["slice"](I0x2C, I0x2C + 4) ===
                  "    "
                ) {
                  e["target"][
                    "setRangeText"
                  ](
                    e["target"][
                      "value"
                    ]["slice"](I0x2C + 4),
                    I0x2C,
                    e["target"][
                      "value"
                    ]["length"],
                    "start"
                  );

                  while (
                    e["target"][
                      "value"
                    ][I0x2C] == " "
                  ) {
                    I0x2C++;
                  }

                  I0x1E["current"][
                    "setSelectionRange"
                  ](I0x2C, I0x2C);
                }
              }
            }
          }}
        ></textarea>
        <button type="submit">Parse</button>
      </form>
    </div>
  );
}

export default I0x1C;
