// app/api/auth/send-code/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import clientPromise from "@/lib/mongodb";
import { createVerificationCode } from "../../../../lib/auth";

interface VerificationCode {
  code: string;
  expires: Date;
}

interface EmailRequestBody {
  email: string;
}

// --- Email template builder ---------------------------------------------------
function buildMagicCodeEmail(params: {
  code: string;
  minutes: number;
  brand: string;
  supportEmail: string;
  year?: number;
}) {
  const { code, minutes, brand, supportEmail, year = new Date().getFullYear() } = params;

  const text = `Az Ön belépési kódja: ${code}. A kód ${minutes} percig érvényes.
Ha nem Ön kérte ezt a kódot, hagyja figyelmen kívül ezt az e-mailt.

${brand} • ${year}`;

  const html = `<!-- Preheader (rejtett) -->
<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">
  Az Ön belépési kódja: ${code}. ${minutes} percig érvényes.
</span>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f5f7;margin:0;padding:0;">
  <tr>
    <td align="center" style="padding:24px;">
      <!-- Wrapper -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(90deg,#8a2be2,#4b0082);padding:28px 24px;" align="center">
            <div style="font-family:Segoe UI,Arial,sans-serif;font-size:20px;line-height:28px;font-weight:700;color:#ffffff;">
              ${brand} – Belépési kód
            </div>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="padding:28px 24px;">
            <div style="font-family:Segoe UI,Arial,sans-serif;font-size:16px;line-height:24px;color:#1f2937;">
              <p style="margin:0 0 12px 0;">Szia!</p>
              <p style="margin:0 0 16px 0;">Használd az alábbi kódot a fiókodba történő bejelentkezéshez:</p>

              <!-- Code box -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:16px 0;">
                <tr>
                  <td style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:10px;padding:18px 16px;text-align:center;">
                    <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
                                font-size:28px;line-height:36px;letter-spacing:0.35em;font-weight:700;color:#4b0082;">
                      ${code}
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 12px 0;">
                A kód <strong style="color:#7c3aed;">${minutes} percig</strong> érvényes.
              </p>

              <!-- CTA Button (opcionális) -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;">
                <tr>
                  <td align="center">
                    <a href="#" style="display:inline-block;background:#4b0082;color:#ffffff;text-decoration:none;
                                       font-family:Segoe UI,Arial,sans-serif;font-size:14px;line-height:20px;
                                       padding:12px 20px;border-radius:999px;">
                      Belépés a kóddal
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:16px 0 0 0;color:#6b7280;font-size:14px;">
                Ha nem te kérted ezt a kódot, nyugodtan hagyd figyelmen kívül ezt az e-mailt.
              </p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #eef2f7;padding:16px 24px;text-align:center;">
            <div style="font-family:Segoe UI,Arial,sans-serif;font-size:12px;line-height:18px;color:#6b7280;">
              Kérdés esetén írj nekünk: <a href="mailto:${supportEmail}" style="color:#4b0082;text-decoration:none;">${supportEmail}</a><br/>
              © ${year} ${brand}. Minden jog fenntartva.
            </div>
          </td>
        </tr>
      </table>
      <!-- /Wrapper -->

      <!-- Small print -->
      <div style="max-width:560px;margin-top:12px;font-family:Segoe UI,Arial,sans-serif;font-size:11px;line-height:16px;color:#94a3b8;">
        Ezt az üzenetet azért kaptad, mert valaki belépési kódot kért a(z) ${brand} fiókhoz ezzel az e-mail címmel.
      </div>
    </td>
  </tr>
</table>

<style>
@media (prefers-color-scheme: dark) {
  body, table[role="presentation"] { background:#0b1220 !important; }
}
</style>`;

  return { text, html };
}

// --- Route handler ------------------------------------------------------------
export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as Partial<EmailRequestBody>;
    const email = (body?.email ?? "").trim();

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }

    // DB
    const client = await clientPromise;
    const db = client.db();

    type UserDoc = { _id: unknown; email: string };
    const user = await db.collection<UserDoc>("users").findOne({ email });
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Az email cím nincs regisztrálva a rendszerben",
          code: "NOT_REGISTERED",
        },
        { status: 404 }
      );
    }

    // Verifikációs kód generálása
    const { code, expires } = (await createVerificationCode(email)) as VerificationCode;

    // Nodemailer transport
    const host = process.env.EMAIL_SERVER_HOST_SG;
    const portStr = process.env.EMAIL_SERVER_PORT_SG;
    const userSg = process.env.EMAIL_SERVER_USER_SG;
    const passSg = process.env.EMAIL_SERVER_PASSWORD_SG;
    const fromAddr = process.env.EMAIL_FROM;

    if (!host || !portStr || !userSg || !passSg || !fromAddr) {
      return NextResponse.json(
        { success: false, message: "Hiányzó email szerver környezeti változók" },
        { status: 500 }
      );
    }

    const transport = nodemailer.createTransport({
      host,
      port: parseInt(portStr, 10),
      auth: { user: userSg, pass: passSg },
    });

    const brand = "Ingatlan";
    const minutes = 3;
    const supportEmail = "support@bukio.com";
    const { text, html } = buildMagicCodeEmail({
      code,
      minutes,
      brand,
      supportEmail,
    });

    await transport.sendMail({
      from: `Belépési kód 🤫 <${fromAddr}>`,
      to: email,
      subject: `${brand} – Belépési kód`,
      text,
      html,
    });

    return NextResponse.json({
      success: true,
      message: "Verification code sent successfully",
      expires,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
        ? error
        : JSON.stringify(error);

    console.error("Error sending verification code:", message);

    return NextResponse.json(
      { success: false, message: "Internal server error: " + message },
      { status: 500 }
    );
  }
}
