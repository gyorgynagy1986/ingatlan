'use server'

// Kód küldése server action
export async function sendVerificationCodeAction(email: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error in sendVerificationCodeAction:', error);
    return { 
      success: false, 
      message: "Hiba a kód küldésekor. Kérjük, próbálja újra." 
    };
  }
}

// Kód ellenőrzése server action
export async function verifyCodeAction(email: string, code: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error in verifyCodeAction:', error);
    return { 
      success: false, 
      message: "Hiba a kód ellenőrzésekor. Kérjük, próbálja újra." 
    };
  }
}