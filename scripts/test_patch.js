(async () => {
  const res = await fetch('http://147.93.56.252:3002/api/v1/orders', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'DEAL-5501', status: 'completed' })
  });
  console.log('Status for DEAL-5501:', res.status, await res.text());

  const res2 = await fetch('http://147.93.56.252:3002/api/v1/orders', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'ORD-5501', status: 'completed' })
  });
  console.log('Status for ORD-5501:', res2.status, await res2.text());
})();
