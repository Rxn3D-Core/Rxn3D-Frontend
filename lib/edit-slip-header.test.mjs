import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildVirtualSlipVM } from "./virtual-slip-view-model.ts";

const details = (office) => ({
  slip_number: "S1024",
  status: "In Progress",
  case: {
    case_number: "C729",
    patient_name: "Due date testing",
    office,
    lab: { id: 1, name: "HMC Lab", logo_url: "https://cdn.test/hmc.png" },
  },
  products: [],
});

describe("edit slip header (virtual slip header data)", () => {
  it("takes the office logo and name from the slip's office, not the lab", () => {
    const { header } = buildVirtualSlipVM(
      details({ id: 2, name: "Rxn3D Office", logo_url: "https://cdn.test/rxn3d.png" })
    );
    assert.equal(header.officeLogo, "https://cdn.test/rxn3d.png");
    assert.equal(header.officeName, "Rxn3D Office");
    assert.equal(header.labLogo, "https://cdn.test/hmc.png");
  });

  it("has no office logo (so the header shows the office name) when the office has none", () => {
    const { header } = buildVirtualSlipVM(details({ id: 2, name: "Rxn3D Office" }));
    assert.equal(header.officeLogo, null);
    assert.equal(header.officeName, "Rxn3D Office");
    assert.equal(header.slipNumber, "S1024");
    assert.equal(header.caseNumber, "C729");
  });
});
