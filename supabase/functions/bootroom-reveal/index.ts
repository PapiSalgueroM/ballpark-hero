const retiredHeaders = {
  "Access-Control-Allow-Origin": "https://douknowball.com",
  "Content-Type": "application/json",
};

Deno.serve(() => new Response(
  '{"error":"This legacy function has been retired."}',
  { status: 410, headers: retiredHeaders },
));
