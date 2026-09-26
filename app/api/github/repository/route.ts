export async function POST(request: Request) {
  const body = await request.json();

  console.log("Received:", body);

  return Response.json({
    message: "API route is working",
    received: body,
  });
}
