import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../../App.css";

function I0x1C({ identifiers }) {
  const [I0x7, I0x1D] = useState("");
  const I0x1E = useRef();

  const I0x1F = useNavigate();

  function I0x20(I0x21) {
    I0x21[window.atob(identifiers["I0x22"])]();

    I0x1F(`${window.atob(identifiers["I0x23"])}${encodeURIComponent(I0x7)}`);
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
              e[window.atob(identifiers["I0x33"])][
                window.atob(identifiers["I0x24"])
              ]
            )
          }
          onKeyDown={(e) => {
            if (
              e[window.atob(identifiers["I0x25"])] ===
              window.atob(identifiers["I0x26"])
            ) {
              e[window.atob(identifiers["I0x22"])]();

              if (!e[window.atob(identifiers["I0x27"])]) {
                e[window.atob(identifiers["I0x33"])][
                  window.atob(identifiers["I0x28"])
                ](
                  window.atob(identifiers["I0x29"]),
                  e[window.atob(identifiers["I0x33"])][
                    window.atob(identifiers["I0x2A"])
                  ],
                  e[window.atob(identifiers["I0x33"])][
                    window.atob(identifiers["I0x2A"])
                  ],
                  window.atob(identifiers["I0x2B"])
                );

                I0x1D(
                  e[window.atob(identifiers["I0x33"])][
                    window.atob(identifiers["I0x24"])
                  ]
                );
              } else {
                let I0x2C = 0;

                for (
                  let i =
                    e[window.atob(identifiers["I0x33"])][
                      window.atob(identifiers["I0x2A"])
                    ] - 1;
                  i > 0;
                  i--
                ) {
                  if (
                    e[window.atob(identifiers["I0x33"])][
                      window.atob(identifiers["I0x24"])
                    ][i] === window.atob(identifiers["I0x31"])
                  ) {
                    I0x2C = i + 1;
                    break;
                  }
                }

                if (
                  e[window.atob(identifiers["I0x33"])][
                    window.atob(identifiers["I0x24"])
                  ][window.atob(identifiers["I0x2F"])](I0x2C, I0x2C + 4) ===
                  window.atob(identifiers["I0x29"])
                ) {
                  e[window.atob(identifiers["I0x33"])][
                    window.atob(identifiers["I0x28"])
                  ](
                    e[window.atob(identifiers["I0x33"])][
                      window.atob(identifiers["I0x24"])
                    ][window.atob(identifiers["I0x2F"])](I0x2C + 4),
                    I0x2C,
                    e[window.atob(identifiers["I0x33"])][
                      window.atob(identifiers["I0x24"])
                    ][window.atob(identifiers["I0x2E"])],
                    window.atob(identifiers["I0x2D"])
                  );

                  while (
                    e[window.atob(identifiers["I0x33"])][
                      window.atob(identifiers["I0x24"])
                    ][I0x2C] == " "
                  ) {
                    I0x2C++;
                  }

                  I0x1E[window.atob(identifiers["I0x34"])][
                    window.atob(identifiers["I0x30"])
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
