import { useEffect, useState } from "react";

function AdminPolicyPage() {

  const [policy, setPolicy] = useState(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/policy")
      .then(res => res.json())
      .then(data => setPolicy(data));
  }, []);

  const updatePolicy = async () => {
    await fetch("http://127.0.0.1:8000/policy/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(policy)
    });

    alert("Policy updated!");
  };

  if (!policy) return <div className="glass-panel p-6 text-brand">Loading...</div>;

  return (
    <div className="glass-panel p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand2">Admin panel</p>
      <h1 className="mt-2 font-display text-4xl font-bold uppercase text-brand">Policy Settings</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
        Configure reimbursement limits with the same finance controls used by the claim decision engine.
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <label className="soft-panel block p-5">
          <span className="block font-display text-2xl font-bold uppercase text-brand">Travel Limit</span>
          <input
            className="mt-4 w-full border px-4 py-3"
            value={policy.limits.travel}
            onChange={(e) =>
              setPolicy({
                ...policy,
                limits: { ...policy.limits, travel: Number(e.target.value) }
              })
            }
          />
        </label>

        <label className="soft-panel block p-5">
          <span className="block font-display text-2xl font-bold uppercase text-brand">Food Limit</span>
          <input
            className="mt-4 w-full border px-4 py-3"
            value={policy.limits.food ?? policy.limits.meals ?? ""}
            onChange={(e) =>
              setPolicy({
                ...policy,
                limits: { ...policy.limits, food: Number(e.target.value), meals: Number(e.target.value) }
              })
            }
          />
        </label>

        <label className="soft-panel block p-5">
          <span className="block font-display text-2xl font-bold uppercase text-brand">Office Limit</span>
          <input
            className="mt-4 w-full border px-4 py-3"
            value={policy.limits.office ?? policy.limits.office_supplies ?? ""}
            onChange={(e) =>
              setPolicy({
                ...policy,
                limits: { ...policy.limits, office: Number(e.target.value), office_supplies: Number(e.target.value) }
              })
            }
          />
        </label>
      </div>

      <button
        type="button"
        onClick={updatePolicy}
        className="mt-8 bg-brand2 px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-red-800"
      >
        Save Policy
      </button>
    </div>
  );
}

export default AdminPolicyPage;
