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

  if (!policy) return <div>Loading...</div>;

  return (
    <div style={{ padding: "20px", color: "white" }}>
      <h1>Policy Settings</h1>

      <h3>Travel Limit</h3>
      <input
        value={policy.limits.travel}
        onChange={(e) =>
          setPolicy({
            ...policy,
            limits: { ...policy.limits, travel: Number(e.target.value) }
          })
        }
      />

      <h3>Food Limit</h3>
      <input
        value={policy.limits.food}
        onChange={(e) =>
          setPolicy({
            ...policy,
            limits: { ...policy.limits, food: Number(e.target.value) }
          })
        }
      />

      <h3>Office Limit</h3>
      <input
        value={policy.limits.office}
        onChange={(e) =>
          setPolicy({
            ...policy,
            limits: { ...policy.limits, office: Number(e.target.value) }
          })
        }
      />

      <button onClick={updatePolicy}>
        Save Policy
      </button>
    </div>
  );
}

export default AdminPolicyPage;
