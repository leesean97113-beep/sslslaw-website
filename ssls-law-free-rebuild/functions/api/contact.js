const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
});

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  const allowedOrigins = new Set([
    "https://sslslaw.com",
    "https://www.sslslaw.com",
    "https://sslslaw-website.pages.dev"
  ]);

  if (origin && !allowedOrigins.has(origin)) {
    return json({ error: "Request origin not allowed." }, 403);
  }
  if (!env.RESEND_API_KEY) {
    return json({ error: "The enquiry service is not configured yet." }, 503);
  }

  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return json({ error: "Please submit the form again." }, 415);
  }

  let data;
  try {
    const raw = await request.text();
    if (raw.length > 12000) return json({ error: "Your message is too long." }, 413);
    data = JSON.parse(raw);
  } catch {
    return json({ error: "Please check the form and try again." }, 400);
  }

  // Honeypot field: ordinary visitors leave this empty.
  if (typeof data.companyWebsite === "string" && data.companyWebsite.trim()) {
    return json({ success: true });
  }

  const name = typeof data.name === "string" ? data.name.trim() : "";
  const email = typeof data.email === "string" ? data.email.trim() : "";
  const phone = typeof data.phone === "string" ? data.phone.trim() : "";
  const subject = typeof data.subject === "string" ? data.subject.trim() : "";
  const message = typeof data.message === "string" ? data.message.trim() : "";

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!name || name.length > 120 || !emailPattern.test(email) || email.length > 200 ||
      phone.length > 60 || !subject || subject.length > 160 ||
      !message || message.length > 5000) {
    return json({ error: "Please complete all required fields with valid details." }, 400);
  }

  const safeSubject = subject.replace(/[\r\n]+/g, " ").slice(0, 160);
  const emailText = [
    "New website enquiry — Siew Song & Lee Sean",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone || "Not provided"}`,
    "",
    "Message:",
    message
  ].join("\n");

  let response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "SSLS Website <website@sslslaw.com>",
        to: ["general@sslslaw.com"],
        reply_to: email,
        subject: `Website Enquiry: ${safeSubject}`,
        text: emailText
      })
    });
  } catch {
    return json({ error: "We couldn't send your enquiry right now. Please try again later or contact our office by phone." }, 502);
  }

  if (!response.ok) {
    return json({ error: "We couldn't send your enquiry right now. Please try again later or contact our office by phone." }, 502);
  }

  return json({ success: true });
}

export async function onRequest(context) {
  if (context.request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { "Allow": "POST, OPTIONS" } });
  }
  return json({ error: "Method not allowed." }, 405);
}
