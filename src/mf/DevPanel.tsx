import { Sheet } from "./parts";
import { useMf } from "./store";

type DevToggle = {
  label: string;
  sub: string;
  on: boolean;
  onChange: (on: boolean) => void;
};

// Prototype-only switches, opened from the ₹ button on home. Add a row to `toggles` for each new switch.
export function DevPanel({ onClose }: { onClose: () => void }) {
  const { segment, setSegment, orderPad2, setOrderPad2 } = useMf();

  const toggles: DevToggle[] = [
    {
      label: "Invested flow",
      sub: "The user already holds funds: holdings, past orders and running SIPs.",
      on: segment === "holdings",
      onChange: (on) => setSegment(on ? "holdings" : "new"),
    },
    {
      label: "Order Pad 2.0",
      sub: "Order pads use the DLS Number field: outlined, focused, with the amount in words below.",
      on: orderPad2,
      onChange: setOrderPad2,
    },
  ];

  return (
    <Sheet title="Dev environment" action="Done" onClose={onClose}>
      <ul className="dev-toggles">
        {toggles.map((toggle) => (
          <li key={toggle.label}>
            <label>
              <span>
                <b>{toggle.label}</b>
                <small>{toggle.sub}</small>
              </span>
              <input
                type="checkbox"
                role="switch"
                className="dev-switch"
                checked={toggle.on}
                onChange={(e) => toggle.onChange(e.target.checked)}
              />
            </label>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
