"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import {
  Mail,
  ArrowRight,
  KeyRound,
  RefreshCw,
  ArrowLeft,
  CheckCircle,
  ShieldCheck,
} from "lucide-react";
import {
  sendVerificationCodeAction,
} from "../../../lib/action/auth";

import RegisterImage from "../../../../public/assets/cover.jpg";

// ---- Segédfüggvény: másodpercekből mm:ss formátumot csinál
function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function SignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const { data: session, status, update } = useSession();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [step, setStep] = useState("request"); // 'request' or 'verify'
  const [codeInputFocus, setCodeInputFocus] = useState(false);

  // --- VISSZASZÁMLÁLÓ ---
  const [countdown, setCountdown] = useState(3 * 60); // 3 perc = 180 mp

  // Ha a "verify" lépésre váltunk, indítsuk a visszaszámlálót
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (step === "verify") {
      // Minden alkalommal 3 percről induljon
      setCountdown(180);

      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            // Ha lejárt az idő, visszalépünk, és kiírunk egy hibaüzenetet
            clearInterval(timer!);
            setStep("request");
            setMessage({
              type: "error",
              text: "A kód lejárt, kérjük kérjen újat.",
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step]);

  // Initialize email from URL parameters if available
  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  // Átirányítás ha már be vagyunk jelentkezve
  useEffect(() => {
    if (status === "authenticated" && session) {
      const callbackUrl = searchParams.get("callbackUrl");
      // Egy kis késleltetés, hogy a UI átmenet simább legyen
      setTimeout(() => {
        router.push(callbackUrl || "/dashboard");
      }, 500);
    }
  }, [status, session, router, searchParams]);

  const handleRequestCode = async (
    e?: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e?.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const data = await sendVerificationCodeAction(email);

      if (!data.success) {
        setMessage({
          type: "error",
          text:
            data.message ||
            "Nem sikerült elküldeni a kódot. Kérjük, próbálja újra.",
        });
      } else {
        setMessage({
          type: "success",
          text: "Ellenőrizze e-mailjét a 6 számjegyű kódért!",
        });
        // Ha már a verify lépésen vagyunk, csak nullázzuk a visszaszámlálót
        if (step === "verify") {
          setCountdown(180); // újraindítjuk a számlálót
        } else {
          // Egyébként váltsunk át a verify lépésre, ami beállítja a visszaszámlálást
          setStep("verify");
        }
      }
    } catch (error) {
      console.error("Error sending code:", error);
      setMessage({
        type: "error",
        text: "Valami hiba történt. Kérjük, próbálja újra.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      // Most a signIn-nek átadjuk mind az email-t, mind a kódot
      const result = await signIn("credentials", {
        email: email,
        code: code, // Kód átadása
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (result?.error) {
        setMessage({
          type: "error",
          text:
            result.error ||
            "Nem sikerült a bejelentkezés. Kérjük, próbálja újra.",
        });
      } else if (result?.ok) {
        // Sikeres bejelentkezés
        setMessage({
          type: "success",
          text: "Sikeres bejelentkezés! Átirányítás...",
        });
        
        // Session frissítése
        await update();
        
        // Egy kis várakozás a jobb UX-ért
        setTimeout(() => {
          const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
          router.push(callbackUrl);
        }, 1000);
      }
    } catch (error) {
      console.error("Verification error:", error);
      setMessage({
        type: "error",
        text: "Valami hiba történt. Kérjük, próbálja újra.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading állapot
  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <RefreshCw className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Betöltés...</p>
        </div>
      </div>
    );
  }

  // Ha már be van jelentkezve, mutasson egy átmeneti üzenetet
  if (status === "authenticated" && session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-10">
            <Link
              href="/"
              className="inline-flex items-center justify-center space-x-2"
            >
              <span className="bg-indigo-600 text-white p-2 rounded-lg shadow-md">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
                  <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
                  <line x1="6" y1="1" x2="6" y2="4"></line>
                  <line x1="10" y1="1" x2="10" y2="4"></line>
                  <line x1="14" y1="1" x2="14" y2="4"></line>
                </svg>
              </span>
              <span className="text-2xl font-bold text-gray-900">Ingatlan</span>
            </Link>
          </div>

          <div className="bg-white shadow-xl rounded-xl overflow-hidden">
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4 animate-pulse">
                <CheckCircle size={28} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Sikeres bejelentkezés!
              </h1>
              <p className="text-gray-600 mb-6">
                Átirányítás folyamatban...
              </p>
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <RefreshCw className="animate-spin h-5 w-5 text-indigo-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render a form az aktuális lépés alapján
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Bal oldali (képes) szekció */}
      <div className="relative hidden lg:flex lg:flex-1">
        <Image
          src={RegisterImage}
          alt="Bejelentkezés"
          fill
          priority
          quality={70}
          style={{ objectFit: "cover" }}
        />
        {/* Modern átmenetes overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/70 via-indigo-800/60 to-indigo-900/70" />
        {/* Képen lévő szöveg */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white p-6 max-w-md space-y-6 z-10">
            <h2 className="text-4xl font-bold leading-tight">
              Biztonságos bejelentkezés kóddal
            </h2>
            <p className="text-lg text-indigo-100">
              Jelentkezzen be biztonságosan az e-mail címére küldött ellenőrző
              kóddal, jelszó nélkül.
            </p>
            <div className="py-4">
              <div className="space-y-3 max-w-sm mx-auto">
                <div className="flex items-center p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                  <div className="bg-green-500 text-white p-2 rounded-lg mr-3">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="text-white text-left">
                    <p className="font-medium">Biztonságos bejelentkezés</p>
                    <p className="text-xs text-indigo-200">
                      Nincs szükség jelszóra
                    </p>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                  <div className="bg-indigo-500 text-white p-2 rounded-lg mr-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </div>
                  <div className="text-white text-left">
                    <p className="font-medium">Gyors hozzáférés</p>
                    <p className="text-xs text-indigo-200">
                      Percek alatt bejelentkezhet
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Jobb oldali űrlap */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-8 lg:p-12 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="w-full max-w-md">
          {/* Logo - mobilon látható */}
          <div className="text-center mb-8 lg:hidden">
            <Link
              href="/"
              className="inline-flex items-center justify-center space-x-2"
            >
              <span className="bg-indigo-600 text-white p-2 rounded-lg shadow-md">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
                  <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
                  <line x1="6" y1="1" x2="6" y2="4"></line>
                  <line x1="10" y1="1" x2="10" y2="4"></line>
                  <line x1="14" y1="1" x2="14" y2="4"></line>
                </svg>
              </span>
              <span className="text-2xl font-bold text-gray-900">Ingatlan</span>
            </Link>
          </div>

          {/* Kártya */}
          <div className="bg-white shadow-xl rounded-xl overflow-hidden transition-all duration-300 transform">
            {/* Lépésjelző sáv */}
            <div className="h-2 bg-indigo-600"></div>
            <div className="relative h-2 bg-gray-100">
              <div
                className={`absolute top-0 left-0 h-full bg-indigo-600 transition-all duration-500 ease-in-out ${
                  step === "request" ? "w-1/2" : "w-full"
                }`}
              ></div>
            </div>

            <div className="p-8">
              {step === "request" ? (
                <>
                  {/* KÓD KÉRÉSE */}
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 mb-4">
                      <Mail size={28} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      Bejelentkezés
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                      Adja meg email címét, és küldünk egy 6 számjegyű kódot
                    </p>
                  </div>

                  <form className="space-y-6" onSubmit={handleRequestCode}>
                    <div>
                      <label
                        htmlFor="email-address"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Email cím
                      </label>
                      <div className="relative">
                        <input
                          id="email-address"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          className="block w-full rounded-lg border-0 py-3 px-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                          placeholder="pelda@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={isSubmitting}
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <Mail className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>

                    {message && (
                      <div
                        className={`p-4 rounded-lg ${
                          message.type === "success"
                            ? "bg-green-50 text-green-800 border border-green-200"
                            : "bg-red-50 text-red-800 border border-red-200"
                        }`}
                      >
                        {message.text}
                      </div>
                    )}

                    <div>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="group relative flex w-full justify-center items-center rounded-lg bg-indigo-600 py-3 px-4 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors duration-200"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="animate-spin -ml-0.5 mr-2 h-4 w-4" />
                            Küldés...
                          </>
                        ) : (
                          <>
                            Kód küldése
                            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  {/* KÓD ELLENŐRZÉSE */}
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 mb-4">
                      <KeyRound size={28} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      Ellenőrző kód megadása
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                      Adja meg a következő email címre küldött 6 számjegyű
                      kódot: <span className="font-medium">{email}</span>
                    </p>
                  </div>

                  {/* Visszaszámláló + form */}
                  <div className="flex flex-col items-center space-y-6">
                    {/* Kör alakú visszaszámláló */}
                    <div className="flex flex-col items-center">
                      <p className="text-sm text-gray-500 mb-2">
                        A kód érvényessége:
                      </p>
                      <div className="relative inline-flex items-center justify-center w-20 h-20">
                        <svg
                          className="absolute inset-0 transform -rotate-90"
                          width="80"
                          height="80"
                        >
                          {/* Háttér kör */}
                          <circle
                            cx="40"
                            cy="40"
                            r="36"
                            stroke="#E5E7EB"
                            strokeWidth="4"
                            fill="none"
                          />
                          {/* Haladó kör */}
                          <circle
                            cx="40"
                            cy="40"
                            r="36"
                            stroke="#6366F1"
                            strokeWidth="4"
                            fill="none"
                            strokeDasharray={2 * Math.PI * 36}
                            strokeDashoffset={
                              2 * Math.PI * 36 * (1 - countdown / 180)
                            }
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="text-2xl font-semibold text-indigo-600">
                          {formatTime(countdown)}
                        </span>
                      </div>
                    </div>

                    <form
                      className="w-full space-y-6"
                      onSubmit={handleVerifyCode}
                    >
                      <div>
                        <label
                          htmlFor="verification-code"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Ellenőrző kód
                        </label>
                        <div
                          className={`relative border ${
                            codeInputFocus
                              ? "border-indigo-600 ring-2 ring-indigo-200"
                              : "border-gray-300"
                          } rounded-lg p-2 transition-all duration-200`}
                        >
                          <input
                            id="verification-code"
                            name="code"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]{6}"
                            maxLength={6}
                            required
                            className="w-full text-center tracking-widest font-mono text-2xl bg-transparent border-none focus:outline-none focus:ring-0 py-2"
                            placeholder="000000"
                            value={code}
                            onChange={(e) =>
                              setCode(
                                e.target.value
                                  .replace(/[^0-9]/g, "")
                                  .slice(0, 6)
                              )
                            }
                            disabled={isSubmitting}
                            onFocus={() => setCodeInputFocus(true)}
                            onBlur={() => setCodeInputFocus(false)}
                            autoFocus
                          />
                        </div>
                      </div>

                      {message && (
                        <div
                          className={`p-4 rounded-lg ${
                            message.type === "success"
                              ? "bg-green-50 text-green-800 border border-green-200"
                              : "bg-red-50 text-red-800 border border-red-200"
                          }`}
                        >
                          {message.text}
                        </div>
                      )}

                      <div>
                        <button
                          type="submit"
                          disabled={isSubmitting || code.length !== 6}
                          className="group relative flex w-full justify-center items-center rounded-lg bg-indigo-600 py-3 px-4 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                          {isSubmitting ? (
                            <>
                              <RefreshCw className="animate-spin -ml-0.5 mr-2 h-4 w-4" />
                              Ellenőrzés...
                            </>
                          ) : (
                            <>
                              Kód ellenőrzése
                              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </>
                          )}
                        </button>
                      </div>

                      <div className="flex flex-col space-y-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setStep("request")}
                          className="inline-flex items-center justify-center text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                        >
                          <ArrowLeft className="mr-1 h-4 w-4" />
                          Más email cím használata
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRequestCode()}
                          disabled={isSubmitting}
                          className="inline-flex items-center justify-center text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                        >
                          <RefreshCw
                            className={`mr-1 h-4 w-4 ${
                              isSubmitting ? "animate-spin" : ""
                            }`}
                          />
                          Kód újraküldése
                        </button>
                      </div>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Lábléc */}
          <div className="mt-8 text-center">
            <div className="text-sm text-gray-500 mb-4">
              <p>A kód a biztonsága érdekében 3 percig érvényes</p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center text-sm text-gray-500 hover:text-indigo-600"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Vissza a főoldalra
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}