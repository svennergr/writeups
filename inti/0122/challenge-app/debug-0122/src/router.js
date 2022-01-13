import { BrowserRouter, Routes, Route } from "react-router-dom";
import I0x1C from "./pages/I0x1C";
import I0x1 from "./pages/I0x1";

const identifiers = {
  I0x1: "UmVzdWx0",
  I0x2: "cGF5bG9hZEZyb21Vcmw=",
  I0x3: "cXVlcnlSZXN1bHQ=",
  I0x4: "bG9jYXRpb24=",
  I0x5: "c2VhcmNo",
  I0x6: "Z2V0",
  I0x7: "cGF5bG9hZA==",
  I0x8: "cmVzdWx0",
  I0x9: "X19odG1s",
  I0xA: "PGgxIHN0eWxlPSdjb2xvcjogIzAwYmZhNSc+Tm90aGluZyBoZXJlITwvaDE+",
  I0xB: "aGFuZGxlQXR0cmlidXRlcw==",
  I0xC: "ZWxlbWVudA==",
  I0xD: "Y2hpbGQ=",
  I0xE: "Y2hpbGRyZW4=",
  I0xF: "YXR0cmlidXRlcw==",
  I0x10: "Z2V0QXR0cmlidXRl",
  I0x11: "ZGF0YS1kZWJ1Zw==",
  I0x12: "c2FuaXRpemVIVE1M",
  I0x13: "aHRtbE9iag==",
  I0x14: "dGVtcGxhdGU=",
  I0x15: "c2FuaXRpemU=",
  I0x16: "Y3JlYXRlRWxlbWVudA==",
  I0x17: "aW5uZXJIVE1M",
  I0x18: "YXBwZW5kQ2hpbGQ=",
  I0x19: "Z2V0RWxlbWVudHNCeVRhZ05hbWU=",
  I0x1A: "Y29udGVudA==",
  I0x1B: "cmVtb3ZlQ2hpbGQ=",
  I0x1C: "SG9tZQ==",
  I0x1D: "c2V0UGF5bG9hZA==",
  I0x1E: "ZWRpdG9yUmVm",
  I0x1F: "bmF2aWdhdGU=",
  I0x20: "aGFuZGxlU3VibWl0",
  I0x21: "ZXZlbnQ=",
  I0x22: "cHJldmVudERlZmF1bHQ=",
  I0x23: "L3Jlc3VsdD9wYXlsb2FkPQ==",
  I0x24: "dmFsdWU=",
  I0x25: "a2V5",
  I0x26: "VGFi",
  I0x27: "c2hpZnRLZXk=",
  I0x28: "c2V0UmFuZ2VUZXh0",
  I0x29: "ICAgIA==",
  I0x2A: "c2VsZWN0aW9uU3RhcnQ=",
  I0x2B: "ZW5k",
  I0x2C: "bGluZVN0YXJ0",
  I0x2D: "c3RhcnQ=",
  I0x2E: "bGVuZ3Ro",
  I0x2F: "c2xpY2U=",
  I0x30: "c2V0U2VsZWN0aW9uUmFuZ2U=",
  I0x31: "Cg==",
  I0x32: "Ym9keQ==",
  I0x33: "dGFyZ2V0",
  I0x34: "Y3VycmVudA==",
};

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/">
          <Route index element={<I0x1C identifiers={identifiers} />} />
          <Route path="result" element={<I0x1 identifiers={identifiers} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
